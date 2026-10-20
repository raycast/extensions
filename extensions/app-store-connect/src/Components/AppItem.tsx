import { Color, Icon, Image, List } from "@raycast/api";
import { App } from "../Model/schemas";
import React from "react";

interface AppItemProps {
  id: string;
  app: App;
  title: string;
  subtitle?: string;
  /** Resolved by the parent list via useAppIcons, so one request covers every row. */
  iconURL?: string;
  accessories?: React.ComponentProps<typeof List.Item>["accessories"];
  actions: React.ReactNode;
}

export default function AppItem({ id, title, actions, subtitle, iconURL, accessories }: AppItemProps) {
  return (
    <List.Item
      id={id}
      // An app only has an icon once a build carrying one has been uploaded, so fall
      // back to a real glyph — an empty source renders as an empty dashed placeholder.
      icon={
        iconURL
          ? { source: iconURL, mask: Image.Mask.RoundedRectangle }
          : { source: Icon.AppWindow, tintColor: Color.SecondaryText }
      }
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      actions={actions}
    />
  );
}
