import { Icon, Image } from "@raycast/api";
import { ProcessInfo } from "../models/interfaces";
import { Stack, stackIcon } from "./stack";

/**
 * The framework's or runtime's logo when one was detected. Otherwise a macOS app shows its bundle's
 * icon and a Windows executable its own icon, and anything else a generic terminal.
 */
export function getProcessIcon(p: Pick<ProcessInfo, "path">, stack: Stack | undefined): Image.ImageLike {
  const entry = stack?.framework ?? stack?.runtime;
  if (entry !== undefined) return stackIcon(entry);

  const appBundle = p.path?.match(/^(\/.+?\.app)\//)?.[1];
  if (appBundle !== undefined) return { fileIcon: appBundle };
  if (p.path !== undefined && /\.exe$/i.test(p.path)) return { fileIcon: p.path };

  return Icon.Terminal;
}
