import { Icon } from "@raycast/api";

export const APP_ICONS: Record<string, Icon> = {
  Terminal: Icon.Terminal,
  Window: Icon.Window,
  AppWindow: Icon.AppWindow,
  Code: Icon.Code,
  Bolt: Icon.Bolt,
  Rocket: Icon.Rocket,
  Hammer: Icon.Hammer,
  Gear: Icon.Gear,
  Star: Icon.Star,
  Monitor: Icon.Monitor,
  Globe: Icon.Globe,
  Folder: Icon.Folder,
  MagnifyingGlass: Icon.MagnifyingGlass,
};

export const APP_ICON_NAMES = Object.keys(APP_ICONS);

export function iconByName(name?: string): Icon {
  if (name && name in APP_ICONS) {
    return APP_ICONS[name];
  }
  return Icon.Terminal;
}
