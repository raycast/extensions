import { List, Icon, Color } from "@raycast/api";

type IconSource = Icon | string | { source: string; tintColor?: Color };

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconSource; // Raycast Icon, asset filename (string), or { source: string, tintColor?: Color }
  assetSource?: string; // Asset filename (e.g., "nothing-to-do-here.png" or "homer.gif")
  tintColor?: Color; // Tint color for Raycast icons
  accessories?: List.Item.Accessory[];
  detail?: React.ReactElement;
  actions?: React.ReactElement;
  keywords?: string[];
  id?: string;
}

export function ListItem(props: ListItemProps) {
  const { title, subtitle, icon, assetSource, tintColor, accessories, detail, actions, keywords, id } = props;

  // Determine icon prop based on what's provided
  let iconProp: List.Item.Props["icon"];

  if (assetSource) {
    // Asset file (image or GIF) - use as ImageLike
    iconProp = assetSource;
  } else if (icon) {
    // Icon can be Icon enum, string (asset), or object with source
    if (typeof icon === "object" && "source" in icon) {
      // Already an object with source (and possibly tintColor)
      iconProp = icon;
    } else if (typeof icon === "string") {
      // String asset filename - use directly as ImageLike
      iconProp = icon;
    } else {
      // Raycast Icon - always include tintColor if provided
      iconProp = {
        source: icon,
        ...(tintColor !== undefined && { tintColor }),
      };
    }
  }

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={subtitle}
      icon={iconProp}
      accessories={accessories}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      detail={detail as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actions={actions as any}
      keywords={keywords}
    />
  );
}
