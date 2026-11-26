// Shared action sections: environment links, search-token filters, and hierarchy navigation.

import { SaveQuicklinkAction } from "./quicklink";
import { Action, ActionPanel, Color, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { consoleDagsBucketUrl, consoleEnvironmentUrl, consoleLogsUrl } from "../lib/composer";
import { TokenKey, setToken } from "../lib/filter";
import { errorText } from "../lib/raycast";
import { hotkey } from "../lib/shortcut";
import { ComposerEnvironment } from "../lib/types";
import { SwitchProjectAction } from "./project-picker";

export function EnvironmentActions(props: { env: ComposerEnvironment; title?: string }) {
  const { env } = props;
  const bucket = consoleDagsBucketUrl(env);
  return (
    <ActionPanel.Section title={props.title ?? `Environment · ${env.id}`}>
      <Action.OpenInBrowser
        title="Open Airflow UI"
        url={env.airflowUri}
        icon={Icon.Globe}
        shortcut={hotkey(["cmd", "shift"], "a")}
      />
      <Action.OpenInBrowser title="Open Composer Monitoring" url={consoleEnvironmentUrl(env)} icon={Icon.LineChart} />
      <Action.OpenInBrowser title="Open Composer Logs" url={consoleLogsUrl(env)} icon={Icon.Terminal} />
      {bucket && <Action.OpenInBrowser title="Open DAGs Bucket" url={bucket} icon={Icon.Folder} />}
      <Action.CopyToClipboard title="Copy Airflow URI" content={env.airflowUri} />
      <Action.CopyToClipboard title="Copy Environment Resource Name" content={env.name} />
      <SaveQuicklinkAction context={{ project: env.project, env: env.name }} name={`Composer · ${env.id}`} />
    </ActionPanel.Section>
  );
}

export interface FilterOption {
  key: TokenKey;
  value: string;
  title: string;
}

/** Submenu that writes key:value tokens into the search bar (and one to clear them). */
export function FilterSubmenu(props: {
  searchText: string;
  setSearchText: (s: string) => void;
  options: FilterOption[];
  title?: string;
}) {
  const { searchText, setSearchText } = props;
  return (
    <ActionPanel.Submenu title={props.title ?? "Filter…"} icon={Icon.Filter} shortcut={hotkey(["cmd"], "f")}>
      {props.options.map((o) => (
        <Action
          key={`${o.key}:${o.value}`}
          title={o.title}
          onAction={() => setSearchText(setToken(searchText, o.key, o.value))}
        />
      ))}
      <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={() => setSearchText("")} />
    </ActionPanel.Submenu>
  );
}

/** "Up" (pop) plus any number of widen/narrow pushes supplied by the caller. */
export function NavigateSection(props: { upTitle?: string; children?: React.ReactNode }) {
  const { pop } = useNavigation();
  return (
    <ActionPanel.Section title="Navigate">
      {props.upTitle && (
        <Action
          title={`Up to ${props.upTitle}`}
          icon={Icon.ArrowUp}
          shortcut={hotkey(["cmd"], "arrowUp")}
          onAction={pop}
        />
      )}
      <>{props.children}</>
      <SwitchProjectAction />
    </ActionPanel.Section>
  );
}

export const refreshShortcut: Keyboard.Shortcut = hotkey(["cmd"], "r");
export const detailShortcut: Keyboard.Shortcut = hotkey(["cmd"], "d");

/** Empty state for a list whose data failed to load, with Retry. */
export function LoadErrorView(props: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title={props.title}
      description={errorText(props.error)}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} shortcut={refreshShortcut} onAction={props.onRetry} />
          <SwitchProjectAction />
        </ActionPanel>
      }
    />
  );
}

export function crumbs(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" › ");
}
