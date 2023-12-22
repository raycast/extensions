import { Icon, Color, Action, ActionPanel } from "@raycast/api";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { callSceneActivateService } from "./utils";
import { EntityStandardActionSections } from "@components/entity";
import { HAOpenUrlInAction } from "@components/actions";

export function SceneActivateAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("scene")) {
    return null;
  }
  return (
    <Action
      title="Activate"
      onAction={() => callSceneActivateService(s)}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
    />
  );
}

export function SceneEditInBrowserAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.entity_id.startsWith("scene")) {
    const id = props.state.attributes.id as number | undefined;
    if (id !== undefined) {
      const url = ha.navigateUrl(`config/scene/edit/${id}`);
      return (
        <HAOpenUrlInAction url={url} title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "e" }} />
      );
    }
  }
  return null;
}

export function SceneActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <SceneActivateAction state={state} />
        <SceneEditInBrowserAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
