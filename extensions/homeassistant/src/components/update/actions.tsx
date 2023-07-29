import { Action, Icon, Color, showHUD, confirmAlert, ActionPanel } from "@raycast/api";
import { ha } from "../../common";
import { State } from "../../haapi";
import { ChangelogDetail } from "./detail";
import { EntityStandardActionSections } from "../entity";

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
  return (
    <Action.OpenInBrowser
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      url={url}
      onOpen={() => showHUD("Open Release Notes in Browser")}
    />
  );
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
  const handle = async () => {
    if (
      await confirmAlert({
        title: `Installing Update ${s.attributes.title || ""}?
        `,
        message: "Backup will be generated before if the integration supports it",
      })
    )
      await ha.callService("update", "install", { entity_id: s.entity_id, backup: true });
  };
  return (
    <Action
      title="Update with Backup"
      onAction={handle}
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
  const handle = async () => {
    if (
      await confirmAlert({
        title: `Skip version ${s.attributes.title || ""}?`,
      })
    )
      await ha.callService("update", "skip", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Skip Update"
      onAction={handle}
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
