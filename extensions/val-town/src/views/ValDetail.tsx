import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getValDetail, listVals, setPrivacy, webUrlFor } from "../lib/api";
import { appAccessColor, errorMessage, formatRelative, privacyColor } from "../lib/format";
import { cacheVal, cachedReadme, cachedVal } from "../lib/cache";
import { loadReadme } from "../lib/readme";
import { cmdOrCtrl } from "../lib/shortcuts";
import { loadState } from "../lib/store";
import type { Privacy } from "../lib/types";
import { readValConfig, writeValConfig, type ValConfig } from "../lib/valconfig";
import { BlobList } from "./BlobList";
import { FileList } from "./FileList";
import { HistoryList } from "./HistoryList";
import { RegisterVal } from "./RegisterVal";
import { RunVal } from "./RunVal";
import { SqliteQuery } from "./SqliteQuery";

export function ValDetail({ identifier }: { identifier: string }) {
  const { push } = useNavigation();

  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(
    async (val: string) => {
      /**
       * `list_vals` is the source for the val's own fields: it has reliably carried description,
       * privacy, httpPrivacy and createdAt, where the same fields off `get_val_detail` have come
       * back empty. `get_val_detail` is kept for branches, which only it reports, and is allowed
       * to fail without taking the view down with it.
       */
      const [summaries, detail, state] = await Promise.all([
        listVals({ name: val.split("/")[1] }),
        getValDetail(val).catch(() => null),
        loadState(),
      ]);

      const summary = summaries.vals.find((candidate) => candidate.identifier === val);
      const config = await readValConfig(val).catch(() => null);

      if (detail) {
        const branches = detail.branches?.items ?? [];
        const main = branches.find((branch) => branch.name === "main") ?? branches[0];
        cacheVal(val, { version: main?.version ?? -1, detail });
      }

      return { summary, detail, entry: state.tools[val], config };
    },
    [identifier],
  );

  // Its own request so the val's own fields render immediately, seeded from whatever the list
  // already warmed while the row was hovered.
  const { data: readme, isLoading: loadingReadme } = useCachedPromise(loadReadme, [identifier], {
    initialData: cachedReadme(identifier)?.content ?? null,
  });

  const summary = data?.summary;
  // The hover-warmed bucket paints the pane while the fresh fetch (the staleness check) runs.
  const detail = data?.detail ?? cachedVal(identifier)?.detail;
  const config = data?.config ?? null;
  const isTool = data?.entry !== undefined;
  const inputEntries = Object.entries(config?.inputSchema?.properties ?? {}).map(
    ([key, value]) => [key, ((value as { type?: string }).type ?? "any") as string] as const,
  );

  const privacy = summary?.privacy ?? detail?.privacy;
  const appAccess = summary?.httpPrivacy ?? detail?.httpPrivacy;
  const webUrl = summary?.links.html ?? detail?.htmlUrl ?? webUrlFor(identifier);
  const branches = detail?.branches?.items ?? [];
  const updatedAt = (branches.find((branch) => branch.name === "main") ?? branches[0])?.updatedAt;
  const branchCount = detail?.branches?.count ?? branches.length;
  const branch = branches[0]?.name ?? "main";

  function configure(register: boolean) {
    push(
      <RegisterVal
        identifier={identifier}
        register={register}
        member={isTool}
        preloaded={register ? undefined : config}
        valDescription={summary?.description ?? detail?.description}
        // mutate rethrows if the refetch fails; falling back to revalidate turns that into error state.
        onSaved={() => void mutate().catch(() => revalidate())}
      />,
    );
  }

  /** Both axes are tier-gated, so a rejection is reported rather than swallowed. */
  async function changeAccess(label: string, apply: () => Promise<void>) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting ${label}` });
    try {
      await apply();
      await mutate();
      toast.style = Toast.Style.Success;
      toast.title = `Now ${label}`;
    } catch (changeError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not change access";
      toast.message = errorMessage(changeError);
    }
  }

  async function updateConfig(change: Partial<ValConfig>, doing: string, done: string) {
    if (!config) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: doing });
    try {
      await writeValConfig(identifier, { ...config, ...change });
      await mutate();
      toast.style = Toast.Style.Success;
      toast.title = done;
    } catch (writeError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not change this val";
      toast.message = errorMessage(writeError);
    }
  }

  if (error) {
    return <Detail navigationTitle={identifier} markdown={`# Could not load this val\n\n${errorMessage(error)}`} />;
  }

  const name = summary?.name ?? detail?.name ?? identifier.split("/")[1] ?? identifier;
  const description = summary?.description ?? detail?.description;

  // The body is the README alone: the val's own fields sit in the metadata beside it.
  const body = readme ?? (loadingReadme ? "Loading readme" : "_No readme._");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={identifier}
      markdown={body}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Val Town" target={webUrl} text="Open in Browser" />
          <Detail.Metadata.Label title="Name" text={name} />
          {description ? <Detail.Metadata.Label title="Description" text={description} /> : null}
          <Detail.Metadata.TagList title="Details">
            <Detail.Metadata.TagList.Item
              text={privacy ?? "unknown"}
              color={privacy ? privacyColor(privacy) : undefined}
            />
            {config?.active ? <Detail.Metadata.TagList.Item text="ai" color={Color.Purple} /> : null}
            {appAccess === "restricted" ? (
              <Detail.Metadata.TagList.Item text="app: restricted" color={appAccessColor(appAccess)} />
            ) : null}
            {updatedAt ? <Detail.Metadata.TagList.Item text={formatRelative(updatedAt)} color={Color.Blue} /> : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {/*
           * Unlike a list row, this pane states the whole picture: no config says nothing at all,
           * an enabled val says so and whether it stops to ask, and a disabled one says only that.
           */}
          {isTool && !config ? (
            <Detail.Metadata.TagList title="AI Agent Access">
              <Detail.Metadata.TagList.Item text="config unreadable" color={Color.Red} />
            </Detail.Metadata.TagList>
          ) : null}
          {config ? (
            <Detail.Metadata.Label
              title="AI Agent Access"
              text={config.description ?? `The val's own: ${description ?? "none"}`}
            />
          ) : null}
          {config ? <Detail.Metadata.Label title="Confirm Before Run" text={config.confirm ? "Yes" : "No"} /> : null}
          {config ? (
            inputEntries.length > 0 ? (
              <Detail.Metadata.TagList title="Inputs">
                {inputEntries.map(([key, type]) => (
                  <Detail.Metadata.TagList.Item key={key} text={`${key}:${type}`} />
                ))}
              </Detail.Metadata.TagList>
            ) : (
              <Detail.Metadata.Label title="Inputs" text="none" />
            )
          ) : null}
          {config ? (
            <Detail.Metadata.Label title="Entrypoint" text={config.entrypoint ?? "resolved at run time"} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Data">
            <Action.Push title="Files" icon={Icon.Folder} target={<FileList val={identifier} branch={branch} />} />
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
                // Running needs the config (entrypoint, inputs), so the first run goes through setup.
                onAction={() => configure(!isTool)}
              />
            )}
            <Action
              title="Configure Val"
              icon={Icon.Pencil}
              shortcut={cmdOrCtrl("t")}
              onAction={() => configure(false)}
            />
            <Action.Push
              title="History"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              target={<HistoryList val={identifier} branch={branch} />}
            />
            <Action.Push
              title="SQLite"
              icon={Icon.List}
              shortcut={cmdOrCtrl("l")}
              target={<SqliteQuery val={identifier} />}
            />
            <Action.Push
              title="Blobs"
              icon={Icon.Box}
              shortcut={cmdOrCtrl("b")}
              target={<BlobList val={identifier} />}
            />
            {branchCount > 1 ? (
              <Action.Push
                title="Browse Branches"
                icon={Icon.Tree}
                target={<BranchList val={identifier} branches={branches} />}
              />
            ) : null}
            <ActionPanel.Submenu title="Change Visibility" icon={Icon.Eye}>
              {(["public", "unlisted", "private"] as Privacy[]).map((value) => (
                <Action
                  key={value}
                  title={value}
                  icon={value === privacy ? Icon.CheckCircle : Icon.Circle}
                  onAction={
                    value === privacy
                      ? () => undefined
                      : () => changeAccess(`code ${value}`, () => setPrivacy(identifier, value))
                  }
                />
              ))}
            </ActionPanel.Submenu>
            <Action.OpenInBrowser title="Open on Val Town" url={webUrl} />
          </ActionPanel.Section>

          <ActionPanel.Section title="AI Agent Access">
            {!isTool ? (
              <Action
                title="Enable AI Agent Access"
                icon={Icon.CheckCircle}
                shortcut={cmdOrCtrl("a", "shift")}
                onAction={() => configure(true)}
              />
            ) : null}
            {isTool && config && !config.active ? (
              <Action
                title="Enable AI Agent Access"
                icon={Icon.CheckCircle}
                shortcut={cmdOrCtrl("a", "shift")}
                onAction={() => updateConfig({ active: true }, "Enabling", "Enabled")}
              />
            ) : null}
            {isTool && config?.active ? (
              <Action
                title="Disable AI Agent Access"
                icon={Icon.Circle}
                shortcut={cmdOrCtrl("a", "shift")}
                onAction={() => updateConfig({ active: false }, "Disabling", "Disabled")}
              />
            ) : null}
            {isTool && config?.active ? (
              <Action
                title={config.confirm ? "Disable Confirm" : "Require Confirm"}
                icon={config.confirm ? Icon.LockUnlocked : Icon.Lock}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={() =>
                  config.confirm
                    ? updateConfig({ confirm: false }, "Removing confirmation", "Runs without asking")
                    : updateConfig({ confirm: true }, "Requiring confirmation", "Asks before running")
                }
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/**
 * A list rather than a submenu: a branch name is data, and Raycast's title-case rule applies to
 * action titles but not to list items.
 */
function BranchList({ val, branches }: { val: string; branches: { name: string; version: number }[] }) {
  return (
    <List navigationTitle={`Branches · ${val}`} searchBarPlaceholder="Filter branches">
      {branches.map((branch) => (
        <List.Item
          key={branch.name}
          icon={Icon.Tree}
          title={branch.name}
          accessories={[{ text: `v${branch.version}` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Files"
                icon={Icon.Folder}
                target={<FileList val={val} branch={branch.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
