import { Color, Detail, Icon, Action, ActionPanel, showHUD, confirmAlert } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

function ChangelogDetail(props: { state: State }): JSX.Element {
  const s = props.state;
  const md = s.attributes.release_summary || "";
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <UpdateOpenInBrowser state={s} />
        </ActionPanel>
      }
    />
  );
}

export function UpdateShowChangelog(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update") || !s.attributes.release_summary) {
    return null;
  }
  return (
    <Action.Push
      title="Show Changelog"
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={{ source: Icon.TextDocument, tintColor: Color.PrimaryText }}
      target={<ChangelogDetail state={s} />}
    />
  );
}

export function UpdateOpenInBrowser(props: { state: State }): JSX.Element | null {
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
