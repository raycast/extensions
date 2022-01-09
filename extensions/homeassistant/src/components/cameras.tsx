import { ActionPanel, Color, Detail, Icon, PushAction } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

function CameraImage(props: { state: State }): JSX.Element {
  const s = props.state;
  const ep = s.attributes.entity_picture;
  let md = `# ${s.attributes.friendly_name || s.entity_id}`;
  if (ep) {
    const imageUrl = ha.urlJoin(ep);
    md += `\n![Camera](${imageUrl})`;
  }
  return <Detail markdown={md} />;
}

export function CameraShowImage(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const ep = s.attributes.entity_picture;
  if (!s.entity_id.startsWith("camera") || !ep) {
    return null;
  }
  return (
    <PushAction
      title="Show Image"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: Icon.Eye, tintColor: Color.PrimaryText }}
      target={<CameraImage state={s} />}
    />
  );
}

export function CameraTurnOnAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("camera", "turn_on", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Turn On"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      icon={{ source: "power-btn.png", tintColor: Color.Green }}
    />
  );
}

export function CameraTurnOffAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("camera", "turn_off", { entity_id: s.entity_id });
  };
  return (
    <ActionPanel.Item
      title="Turn Off"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      icon={{ source: "power-btn.png", tintColor: Color.Red }}
    />
  );
}
