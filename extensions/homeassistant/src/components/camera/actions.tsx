import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import fs from "fs";
import React from "react";
import { CameraImageDetail } from "./detail";
import { getVideoStreamUrlFromCamera } from "./utils";

export function CameraShowImageAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  const ep = s.attributes.entity_picture;
  if (!s.entity_id.startsWith("camera") || !ep) {
    return null;
  }
  return (
    <Action.Push
      title="Show Image Detail"
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      target={<CameraImageDetail state={s} />}
    />
  );
}

export function CameraTurnOnAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("camera", "turn_on", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Turn On"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function CameraTurnOffAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const handle = async () => {
    await ha.callService("camera", "turn_off", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Turn Off"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "f" }}
      icon={{ source: "power.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function CameraOpenStreamInBrowserAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return <Action.OpenInBrowser title="Open in Browser" shortcut={{ modifiers: ["cmd"], key: "b" }} url={url} />;
}

export function CameraOpenStreamInVLCAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const appPath = "/Applications/VLC.app";
  if (!fs.existsSync(appPath)) {
    return null;
  }

  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return (
    <Action.Open
      title="Open in VLC"
      target={url}
      application="VLC"
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      icon={{ fileIcon: appPath }}
    />
  );
}

export function CameraOpenStreamInIINAAction(props: { state: State }): React.ReactElement | null {
  const s = props.state;
  if (!s.entity_id.startsWith("camera")) {
    return null;
  }
  const appPath = "/Applications/IINA.app";
  if (!fs.existsSync(appPath)) {
    return null;
  }

  const url = getVideoStreamUrlFromCamera(s);
  if (!url) {
    return null;
  }
  return (
    <Action.Open
      title="Open in Iina"
      target={url}
      application="IINA"
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      icon={{ fileIcon: appPath }}
    />
  );
}

export function CameraActionPanel(props: { state: State }) {
  const state = props.state;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Image">
        <CameraShowImageAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Video Stream">
        <CameraOpenStreamInBrowserAction state={state} />
        <CameraOpenStreamInVLCAction state={state} />
        <CameraOpenStreamInIINAAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Controls">
        <CameraTurnOnAction state={state} />
        <CameraTurnOffAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
