import {
  Clipboard,
  Icon,
  MenuBarExtra,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment } from "react";
import { getTokenError, getTokenFingerprint } from "./api/monobank";
import MenuBarFooter, { ConfigureCommandItem, OpenCommandItem, relaunchCommand } from "./components/MenuBarFooter";
import { STORAGE_KEYS } from "./data/constants";
import { shortcuts } from "./data/shortcuts";
import { fetchClientInfo } from "./services/clientInfo";
import { readJson, writeJson } from "./services/storage";
import { Jar } from "./types";
import {
  compareJarsByGoal,
  formatCurrency,
  formatJarBalanceAndGoal,
  formatJarPercentage,
  formatPlainAmount,
  getJarIcon,
  getJarMenuBarTitle,
  getMenuBarJar,
  getSendUrl,
} from "./utils";

/**
 * Jars of the token identified by `scope`, with the one chosen for the title. The scope is part of the
 * arguments, so Raycast's cache of one token's jars is never shown for another token. The choice is cached
 * with the jars, so the menu opens with the chosen jar right away, instead of the default one until it's read.
 */
async function loadJars(scope: string) {
  const [{ clientInfo, pinnedIds, stale, updatedAt }, selectedId] = await Promise.all([
    fetchClientInfo(),
    readJson<string>(STORAGE_KEYS.menuBarJar),
  ]);
  return { jars: clientInfo.jars, pinnedIds, selectedId: selectedId ?? "", stale, updatedAt, scope };
}

async function copy(amount: number, jar: Jar) {
  await Clipboard.copy(formatPlainAmount(amount, jar.currency));
  await showHUD("Copied to Clipboard");
}

/**
 * Jars with a goal not reached yet first, then the ones with a reached goal, then jars without a goal.
 * Within each group, pinned jars come first, in their pinned order, then the rest in monobank's order.
 */
function sortJars(jars: Jar[], pinnedIds: string[]) {
  const rank = (jar: Jar) => {
    const index = pinnedIds.indexOf(jar.id);
    return index === -1 ? pinnedIds.length : index;
  };
  return [...jars].sort((a, b) => compareJarsByGoal(a, b) || rank(a) - rank(b));
}

export default function Command() {
  const { token, jarTitle } = getPreferenceValues<Preferences.JarMenuBar>();
  const scope = getTokenFingerprint(token);
  // Raycast unloads a menu bar command once `isLoading` is false, so the loader does all async work.
  const { data: loaded, isLoading, error, mutate } = useCachedPromise(loadJars, [scope]);
  const tokenError = getTokenError(error);
  // Without a token monobank accepts, cached jars can't be confirmed to belong to the user.
  const data = !tokenError && loaded?.scope === scope ? loaded : undefined;

  if (tokenError) {
    return (
      <MenuBarExtra icon={Icon.Key} tooltip="monobank" isLoading={isLoading}>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={tokenError === "missing" ? "Add Access Token…" : "Invalid Access Token…"}
            icon={Icon.Key}
            tooltip="Open the extension preferences"
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <ConfigureCommandItem />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const jars = data?.jars ?? [];
  const pinnedIds = data?.pinnedIds ?? [];
  const jar = getMenuBarJar(jars, data?.selectedId ?? "", pinnedIds);

  // Waits for the save, because the command unloads soon after its menu closes.
  const select = (id: string) =>
    mutate(writeJson(STORAGE_KEYS.menuBarJar, id), {
      optimisticUpdate: (current) => ({ ...current!, selectedId: id }),
      shouldRevalidateAfter: false,
    });

  if (!jar) {
    // Loaded without jars, failed with nothing cached, or still loading for the first time.
    return (
      <MenuBarExtra icon={error ? Icon.Warning : Icon.Coins} tooltip="monobank" isLoading={isLoading}>
        {data && (
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="No Jars" />
          </MenuBarExtra.Section>
        )}
        {error && (
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Couldn't Load Jars" subtitle="Try Again" onAction={relaunchCommand} />
          </MenuBarExtra.Section>
        )}
        <MenuBarExtra.Section>
          <OpenCommandItem title="Open Accounts" command="accounts" />
          <ConfigureCommandItem />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const others = sortJars(
    jars.filter((item) => item.id !== jar.id),
    pinnedIds,
  );
  const sendUrl = getSendUrl(jar.sendId);

  const renderJar = (item: Jar) => (
    <MenuBarExtra.Item
      key={item.id}
      icon={getJarIcon(item)}
      title={item.title}
      subtitle={
        item.goal
          ? `${formatJarPercentage(item)} · ${formatJarBalanceAndGoal(item)}`
          : formatCurrency(item.balance, item.currency.code)
      }
      tooltip={`Show ${item.title} in the menu bar`}
      onAction={() => select(item.id)}
      alternate={
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title={item.title}
          subtitle="Open Top up Page"
          onAction={() => open(getSendUrl(item.sendId))}
        />
      }
    />
  );

  return (
    <MenuBarExtra
      icon={getJarIcon(jar)}
      title={getJarMenuBarTitle(jar, jarTitle)}
      tooltip={jar.title}
      isLoading={isLoading}
    >
      {/*
        Keyed by the chosen jar, so choosing another one rebuilds these sections. When they're updated in
        place, the menu bar misdraws the changed items: titles go missing and inserted items are indented.
      */}
      <Fragment key={jar.id}>
        <MenuBarExtra.Section title={jar.title}>
          <MenuBarExtra.Item
            title="Balance"
            subtitle={formatCurrency(jar.balance, jar.currency.code)}
            icon={Icon.Coins}
            tooltip="Copy the balance"
            shortcut={shortcuts.copyBalance}
            onAction={() => copy(jar.balance, jar)}
          />
          {!!jar.goal && (
            <MenuBarExtra.Item
              title="Goal"
              subtitle={`${formatCurrency(jar.goal, jar.currency.code)} · ${formatJarPercentage(jar)}`}
              icon={getJarIcon(jar)}
              tooltip="Copy the goal"
              shortcut={shortcuts.copyGoal}
              onAction={() => copy(jar.goal, jar)}
            />
          )}
          {!!jar.goal && jar.balance < jar.goal && (
            <MenuBarExtra.Item
              title="Left to Goal"
              subtitle={formatCurrency(jar.goal - jar.balance, jar.currency.code)}
              icon={Icon.Flag}
              tooltip="Copy the amount left to the goal"
              onAction={() => copy(jar.goal - jar.balance, jar)}
            />
          )}
          <MenuBarExtra.Item
            title="Open Top up Page"
            icon={Icon.Globe}
            shortcut={shortcuts.open}
            onAction={() => open(sendUrl)}
          />
          <MenuBarExtra.Item
            title="Copy Top up Page URL"
            icon={Icon.Link}
            onAction={async () => {
              await Clipboard.copy(sendUrl);
              await showHUD("Copied to Clipboard");
            }}
          />
        </MenuBarExtra.Section>

        {others.length > 0 && <MenuBarExtra.Section title="Jars">{others.map(renderJar)}</MenuBarExtra.Section>}
      </Fragment>

      <MenuBarFooter
        updatedAt={data?.updatedAt}
        offline={data?.stale || !!error}
        openTitle="Open Accounts"
        command="accounts"
      />
    </MenuBarExtra>
  );
}
