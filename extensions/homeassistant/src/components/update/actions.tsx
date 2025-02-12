import { EntityStandardActionSections } from "@components/entity";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon, showHUD } from "@raycast/api";
import { ChangelogDetail } from "./detail";
import { callUpdateInstallService, callUpdateSkipService } from "./utils";

export function UpdateShowChangelogAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update") || !s.attributes.release_summary) {
    return null;
  }
  return (
    <Action.Push
      title="Show Changelog"
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={{ source: Icon.BlankDocument, tintColor: Color.PrimaryText }}
      target={<ChangelogDetail state={s} />}
    />
  );
}

export function UpdateOpenInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const url = s.attributes.release_url;
  if (!s.entity_id.startsWith("update") || !url) {
    return null;
  }
  return <Action.OpenInBrowser url={url} onOpen={() => showHUD("Open Release Notes in Browser")} />;
}

export function UpdateInstallAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update")) {
    return null;
  }
  if (s.state !== "on") {
    return null;
  }
  if (s.attributes.in_progress !== false) {
    return null;
  }
  return (
    <Action
      title="Update with Backup"
      onAction={() => callUpdateInstallService(s)}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
    />
  );
}

export function UpdateSkipVersionAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update")) {
    return null;
  }
  if (s.state !== "on") {
    return null;
  }
  return (
    <Action
      title="Skip Update"
      onAction={() => callUpdateSkipService(s)}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      icon={{ source: Icon.ArrowRight, tintColor: Color.PrimaryText }}
    />
  );
}

export function UpdateActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <UpdateShowChangelogAction state={state} />
        <UpdateOpenInBrowserAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Install">
        <UpdateInstallAction state={state} />
        <UpdateSkipVersionAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
