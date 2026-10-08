import { Color, Icon, Image, environment } from "@raycast/api";
import path from "node:path";
import { MenuBarItem, MenuBarItemHint } from "./menu-bar-types";

export function displayTitle(item: MenuBarItem) {
  if (isSemanticMenuBarItem(item) && item.title?.trim()) {
    return item.title.trim();
  }

  if (item.processName?.trim()) return item.processName.trim();
  return (
    displayBundleName(item.bundleId) ??
    item.title?.trim() ??
    `PID ${item.ownerPid}`
  );
}

export function itemIcon(item: MenuBarItem): Image.ImageLike {
  const semanticIcon = semanticMenuBarIcon(item);
  if (semanticIcon) return semanticIcon;

  if (isSemanticMenuBarItem(item)) return fallbackMenuBarIcon(item);

  if (item.appPath) return { fileIcon: item.appPath };
  if (item.iconPath) return { source: item.iconPath };
  return fallbackMenuBarIcon(item);
}

export function openHint(item: MenuBarItem): MenuBarItemHint {
  return {
    ownerPid: item.ownerPid,
    bundleId: item.bundleId,
    processName: item.processName,
    title: item.title,
    category: itemCategory(item),
    source: item.source,
    frame: item.frame,
  };
}

function itemCategory(item: MenuBarItem) {
  return item.category ?? "app:generic";
}

function isSemanticMenuBarItem(item: MenuBarItem) {
  const category = itemCategory(item);
  return category.startsWith("system:") || category.startsWith("input:");
}

function semanticMenuBarIcon(item: MenuBarItem): Image.ImageLike | undefined {
  switch (itemCategory(item)) {
    case "input:abc":
    case "input:generic":
      return {
        source: path.join(environment.assetsPath, "abc-input-icon.svg"),
      };
    case "system:clock":
      return { source: path.join(environment.assetsPath, "clock-icon.svg") };
    case "system:wifi":
      return Icon.Wifi;
    case "system:bluetooth":
      return Icon.Bluetooth;
    case "system:sound":
      return Icon.Speaker;
    case "system:battery":
      return Icon.Battery;
    case "system:airdrop":
      return Icon.Airplane;
    case "system:focus":
      return Icon.Moon;
    case "system:screen-mirroring":
      return Icon.Desktop;
    case "system:now-playing":
      return Icon.Play;
    case "system:spotlight":
      return Icon.MagnifyingGlass;
    case "system:siri":
      return Icon.Stars;
    case "system:vpn":
      return Icon.Lock;
    case "system:accessibility":
      return Icon.CircleEllipsis;
    default:
      return undefined;
  }
}

function fallbackMenuBarIcon(item: MenuBarItem): Image.ImageLike {
  const semanticIcon = semanticMenuBarIcon(item);
  if (semanticIcon) return semanticIcon;

  return {
    source: isSemanticMenuBarItem(item) ? Icon.CircleEllipsis : Icon.AppWindow,
    tintColor: Color.SecondaryText,
  };
}

function displayBundleName(bundleId?: string) {
  const lastPart = bundleId?.split(".").filter(Boolean).at(-1);
  if (!lastPart) return undefined;

  return lastPart
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
