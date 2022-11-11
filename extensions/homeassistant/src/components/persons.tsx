import { Action } from "@raycast/api";
import React from "react";
import { State } from "../haapi";

export function PersonOpenInGoogleMapsAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("person")) {
    return null;
  }
  const lat = s.attributes.latitude as number | undefined;
  const lon = s.attributes.longitude as number | undefined;
  if (lat === undefined || lon === undefined) {
    return null;
  }
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  return (
    <Action.OpenInBrowser
      title="Open in Google Maps"
      icon="googlemaps.png"
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      url={url}
    />
  );
}

export function PersonCopyUserIDAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("person")) {
    return null;
  }
  const user_id = s.attributes.user_id as string | undefined;
  if (user_id === undefined) {
    return null;
  }
  return (
    <Action.CopyToClipboard
      title="Copy User ID"
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      content={user_id}
    />
  );
}

export function PersonCopyIDAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("person")) {
    return null;
  }
  const id = s.attributes.id as string | undefined;
  if (id === undefined) {
    return null;
  }
  return <Action.CopyToClipboard title="Copy ID" shortcut={{ modifiers: ["cmd", "shift"], key: "i" }} content={id} />;
}
