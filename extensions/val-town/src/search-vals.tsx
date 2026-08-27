import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { listVals, setPrivacy, webUrlFor } from "./lib/api";
import { cacheConfigs, cachedConfigs, cachedState } from "./lib/cache";
import { appAccessColor, errorMessage, privacyColor } from "./lib/format";
import { prefetchVal } from "./lib/readme";
import { cmdOrCtrl } from "./lib/shortcuts";
import { loadState, normalizeState, type ExtensionState } from "./lib/store";
import type { Privacy, ValSummary } from "./lib/types";
import { readConfigs, readValConfig, writeValConfig, type ValConfig } from "./lib/valconfig";
import { RegisterVal } from "./views/RegisterVal";
import { RunVal } from "./views/RunVal";
import { ValDetail } from "./views/ValDetail";

type Collection = "vals" | "tools";

/** Undefined means not read yet; null means the val carries no config. */
type Configs = Record<string, ValConfig | null>;

/**
 * Val Town validates `name` as a project name — it must start with a letter and hold only letters,
 * digits, hyphens and underscores — and rejects the whole call otherwise. A search box takes
 * anything, so it is filtered down to what the API will accept before being sent.
 */
function nameQuery(text: string): string {
  const kept = text.replace(/[^A-Za-z0-9_-]/g, "");
  const firstLetter = kept.search(/[A-Za-z]/);
  return firstLetter === -1 ? "" : kept.slice(firstLetter);
}

export default function SearchVals() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [collection, setCollection] = useCachedState<Collection>("collection", "vals");
  const [configs, setConfigs] = useState<Configs>(cachedConfigs);

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (text: string) => {
      const [{ vals }, state] = await Promise.all([listVals({ name: text || undefined }), loadState()]);
      return { vals, tools: state.tools };
    },
    [nameQuery(searchText)],
    {
      // Seeded from the local cache so the allow list paints before the two round trips finish.
      keepPreviousData: true,
      initialData: { vals: [], tools: cachedState()?.tools ?? {} },
      // Reported without tearing the list down; the rows already on screen are still true.
      onError: (failure) => void showFailureToast(failure, { title: "Could not load your vals" }),
    },
  );

  // The hook's cache outlives a shape change, so its value is migrated before anything reads it.
  const tools = useMemo(
    () => normalizeState({ tools: data?.tools ?? {} } as Record<string, unknown>).tools,
    [data?.tools],
  );
  const summaries = new Map((data?.vals ?? []).map((val) => [val.identifier, val]));

  // Bounded by the allow list rather than by the search results, so it runs in either collection.
  const registered = Object.keys(tools).sort().join(",");

  useEffect(() => {
    if (!registered) return;
    const controller = new AbortController();

    void (async () => {
      const fresh = await readConfigs(registered.split(","), controller.signal).catch((sweepError: unknown) => {
        if (!controller.signal.aborted) {
          void showFailureToast(sweepError, { title: "Could not refresh val settings" });
        }
        return null;
      });
      if (controller.signal.aborted || !fresh) return;
      setConfigs(fresh);
      cacheConfigs(fresh);
    })();

    return () => controller.abort();
  }, [registered]);

  function applyState(next?: ExtensionState) {
    if (!next || !data) {
      revalidate();
      return;
    }
    const updated = { ...data, tools: next.tools };
    void mutate(Promise.resolve(updated), { optimisticUpdate: () => updated, shouldRevalidateAfter: false });
  }

  function rememberConfig(val: string, config: ValConfig | null) {
    setConfigs((current) => {
      const next = { ...current, [val]: config };
      cacheConfigs(next);
      return next;
    });
  }

  function configure(identifier: string, register: boolean, valDescription?: string | null) {
    push(
      <RegisterVal
        identifier={identifier}
        register={register}
        member={identifier in tools}
        preloaded={configs[identifier]}
        valDescription={valDescription}
        onSaved={(next) => {
          applyState(next);
          void readValConfig(identifier)
            .then((config) => rememberConfig(identifier, config))
            .catch(() =>
              setConfigs((current) => {
                // Pre-save values would misreport the save; the sweep repopulates a dropped row.
                const rest = { ...current };
                delete rest[identifier];
                return rest;
              }),
            );
        }}
      />,
    );
  }

  /** The row moves first and is put back if the write fails, since the config lives on the val. */
  async function updateConfig(identifier: string, config: ValConfig, change: Partial<ValConfig>) {
    const next = { ...config, ...change };
    rememberConfig(identifier, next);

    try {
      await writeValConfig(identifier, next);
    } catch (writeError) {
      rememberConfig(identifier, config);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not change this val",
        message: errorMessage(writeError),
      });
    }
  }

  /** Both axes are tier-gated, so a rejection is reported rather than swallowed. */
  async function changeAccess(label: string, apply: () => Promise<void>) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting ${label}` });
    try {
      await apply();
      revalidate();
      toast.style = Toast.Style.Success;
      toast.title = `Now ${label}`;
    } catch (changeError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not change access";
      toast.message = errorMessage(changeError);
    }
  }

  function rowActions(identifier: string, val: ValSummary | undefined, isTool: boolean) {
    const config = configs[identifier];

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Push title="Open Val" icon={Icon.ChevronRight} target={<ValDetail identifier={identifier} />} />
          {config ? (
            <Action.Push
              title="Run Val"
              icon={Icon.Play}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              target={<RunVal identifier={identifier} config={config} />}
            />
          ) : (
            <Action
              title="Run Val"
              icon={Icon.Play}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => configure(identifier, !isTool, val?.description)}
            />
          )}
          <Action
            title="Configure Val"
            icon={Icon.Pencil}
            shortcut={cmdOrCtrl("t")}
            onAction={() => configure(identifier, false, val?.description)}
          />
          <Action.OpenInBrowser title="Open on Val Town" url={val?.links.html ?? webUrlFor(identifier)} />
          {val ? (
            <ActionPanel.Submenu title="Change Visibility" icon={Icon.Eye}>
              {(["public", "unlisted", "private"] as Privacy[]).map((value) => (
                <Action
                  key={value}
                  title={value}
                  icon={value === val.privacy ? Icon.CheckCircle : Icon.Circle}
                  onAction={
                    value === val.privacy
                      ? () => undefined
                      : () => changeAccess(`code ${value}`, () => setPrivacy(identifier, value))
                  }
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
        </ActionPanel.Section>

        <ActionPanel.Section title="AI Agent Access">
          {!isTool ? (
            <Action
              title="Enable AI Agent Access"
              icon={Icon.CheckCircle}
              shortcut={cmdOrCtrl("a", "shift")}
              onAction={() => configure(identifier, true, val?.description)}
            />
          ) : null}
          {isTool && config && !config.active ? (
            <Action
              title="Enable AI Agent Access"
              icon={Icon.CheckCircle}
              shortcut={cmdOrCtrl("a", "shift")}
              onAction={() => updateConfig(identifier, config, { active: true })}
            />
          ) : null}
          {isTool && config?.active ? (
            <Action
              title="Disable AI Agent Access"
              icon={Icon.Circle}
              shortcut={cmdOrCtrl("a", "shift")}
              onAction={() => updateConfig(identifier, config, { active: false })}
            />
          ) : null}
          {isTool && config?.active ? (
            <Action
              title={config.confirm ? "Disable Confirm" : "Require Confirm"}
              icon={config.confirm ? Icon.LockUnlocked : Icon.Lock}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => updateConfig(identifier, config, { confirm: !config.confirm })}
            />
          ) : null}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  // Only when there is nothing to fall back to. A failed search over a list already on screen is a
  // toast, not a dead end.
  if (error && (data?.vals ?? []).length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load your vals"
          description={errorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  /**
   * Listed from the collection rather than from the search results, so a tool whose val was deleted
   * or renamed still shows up and can still be removed. Filtered here because the search bar is
   * driving a server-side query for the other collection.
   */
  /**
   * The collection is what the agent can actually reach, so a disabled val is not in it — it is
   * re-enabled from All Vals or its own pane. Unread configs count as active rather than popping in
   * once the sweep lands; a val with a broken config stays visible, warning and all.
   */
  const reachable = Object.keys(tools).filter((identifier) => configs[identifier]?.active !== false);
  const hasAllowed = reachable.length > 0;
  const showTools = hasAllowed && collection === "tools";

  const toolRows = reachable
    .filter((identifier) => identifier.toLowerCase().includes(searchText.trim().toLowerCase()))
    .sort();

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => {
        if (id) prefetchVal(id);
      }}
      throttle
      searchBarPlaceholder={showTools ? "Filter the vals you allowed" : "Search your vals"}
      searchBarAccessory={
        hasAllowed ? (
          <List.Dropdown
            tooltip="Collection"
            value={showTools ? "tools" : "vals"}
            onChange={(value) => setCollection(value as Collection)}
          >
            <List.Dropdown.Item title="All Vals" value="vals" icon={Icon.Code} />
            <List.Dropdown.Item title="AI Agent Access" value="tools" icon={Icon.Stars} />
          </List.Dropdown>
        ) : undefined
      }
    >
      {showTools ? (
        <>
          <List.EmptyView icon={Icon.MagnifyingGlass} title="No matches" />
          {toolRows.map((identifier) => {
            const val = summaries.get(identifier);
            return (
              <List.Item
                key={identifier}
                id={identifier}
                title={val?.name ?? identifier.split("/")[1] ?? identifier}
                subtitle={val?.description ?? undefined}
                accessories={[
                  ...(val ? accessTags(val.privacy, val.httpPrivacy) : []),
                  ...agentAccess(configs[identifier]),
                ]}
                actions={rowActions(identifier, val, true)}
              />
            );
          })}
        </>
      ) : (
        <>
          <List.EmptyView icon={Icon.MagnifyingGlass} title="No vals found" description="Try a different search." />
          {(data?.vals ?? []).map((val) => {
            const isTool = val.identifier in tools;
            return (
              <List.Item
                key={val.id}
                id={val.identifier}
                title={val.name}
                subtitle={val.description ?? undefined}
                accessories={[
                  ...accessTags(val.privacy, val.httpPrivacy),
                  ...(isTool ? agentAccess(configs[val.identifier]) : []),
                ]}
                actions={rowActions(val.identifier, val, isTool)}
              />
            );
          })}
        </>
      )}
    </List>
  );
}

/**
 * Only the states worth noticing. Private code and a public endpoint are both the quiet case, and a
 * row carrying two tags that both read "public" says less than one that carries neither.
 */
function accessTags(privacy: Privacy, appAccess: "public" | "restricted"): List.Item.Accessory[] {
  const color = privacyColor(privacy);

  return [
    ...(color ? [{ tag: { value: privacy, color }, tooltip: `Code is ${privacy}` }] : []),
    ...(appAccess === "restricted"
      ? [
          {
            tag: { value: "app: private", color: appAccessColor(appAccess) },
            tooltip: "Only granted orgs can call this val's endpoints",
          },
        ]
      : []),
  ];
}

/**
 * Present or absent, never on or off: a val the agent cannot reach looks the same whether it was
 * switched off or never enabled, which is the only distinction the user is asked to care about.
 * Undefined means the config has not been read yet.
 */
function agentAccess(config: ValConfig | null | undefined): List.Item.Accessory[] {
  if (config === undefined) return [];
  if (config === null) {
    return [{ icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip: "No config — calling this will fail" }];
  }
  if (!config.active) return [];

  return [
    ...(config.confirm ? [{ tag: { value: "must confirm", color: Color.Orange } }] : []),
    { tag: { value: "ai", color: Color.Purple }, tooltip: "AI Agent allowed" },
  ];
}
