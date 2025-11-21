import { Grid, Icon, Color } from "@raycast/api";
import React from "react";

type IconSource = Icon | string | { source: string; tintColor?: Color };

interface GridItemProps {
  title: string;
  icon?: IconSource; // Raycast Icon, asset filename (string), or { source: string, tintColor?: Color }
  assetSource?: string; // Asset filename (e.g., "nothing-to-do-here.png" or "homer.gif")
  tooltip?: string;
  actions?: React.ReactNode;
  tintColor?: Color; // Tint color for Raycast icons
}

export function GridItem(props: GridItemProps) {
  const { title, icon, assetSource, tooltip, actions, tintColor } = props;

  // Determine content based on what's provided
  let content: Parameters<typeof Grid.Item>[0]["content"];

  if (assetSource) {
    // Asset file (image or GIF)
    // For grid items with custom assets (GIFs/images), use string directly
    content = assetSource;
  } else if (icon) {
    // Icon can be Icon enum, string (asset), or object with source
    if (typeof icon === "object" && "source" in icon) {
      // Already an object with source (and possibly tintColor)
      // For custom images, use string directly or with tooltip
      if (tooltip) {
        content = {
          value: icon.source,
          tooltip,
        };
      } else {
        content = icon.source;
      }
    } else if (typeof icon === "string") {
      // String asset filename
      // For grid items with custom assets, use string directly or with tooltip
      if (tooltip) {
        content = {
          value: icon,
          tooltip,
        };
      } else {
        content = icon;
      }
    } else {
      // Raycast Icon - always include tintColor if provided
      content = {
        source: icon,
        ...(tintColor !== undefined && { tintColor }),
        ...(tooltip && { tooltip }),
      };
    }
  } else {
    // Fallback: no icon - use a default icon
    content = Icon.Document;
  }

  return (
    <Grid.Item
      title={title}
      content={content}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actions={actions as any}
    />
  );
}
