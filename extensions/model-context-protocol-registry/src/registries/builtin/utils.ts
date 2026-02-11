import { Color, environment, Icon, List, open } from "@raycast/api";
import { RegistryEntry } from "./types";
import { URL } from "url";

function getEnvironmentIcon(entry: RegistryEntry): List.Item.Accessory | undefined {
  switch (entry.configuration.command) {
    case "uvx":
      return { icon: "https://svgl.app/library/python.svg", tooltip: "Python (uvx)" };
    case "npx":
      return { icon: "https://svgl.app/library/nodejs.svg", tooltip: "Node.js (npx)" };
    case "docker":
      return { icon: "https://svgl.app/library/docker.svg", tooltip: "Docker" };
    case "deno":
      return { icon: { source: "https://svgl.app/library/deno.svg", tintColor: Color.PrimaryText }, tooltip: "Deno" };
    case "bunx":
      return { icon: "https://svgl.app/library/bun.svg", tooltip: "Bun" };
    default:
      return { icon: Icon.Terminal, tooltip: entry.configuration.command };
  }
}

function getTransportTypeIcon(entry: RegistryEntry) {
  if ("command" in entry.configuration) {
    return { icon: Icon.Terminal, tooltip: "Standard Input/Output" };
  } else {
    return { icon: Icon.Globe, tooltip: "Server-Sent Events" };
  }
}

export function getAccessories(entry: RegistryEntry) {
  return [getEnvironmentIcon(entry), getTransportTypeIcon(entry)].filter(Boolean) as List.Item.Accessory[];
}

export async function addTextToAIChat(text: string) {
  const protocol = getDeeplinkProtocol();
  const encodedText = encodeURIComponent(text);
  const url = new URL(`${protocol}://ai-chat/add-text?text=${encodedText}`);
  await open(url.href);
}

function getDeeplinkProtocol() {
  if (environment.supportPath.includes("com.raycast.macos.debug")) {
    return "raycastdebug";
  } else if (environment.supportPath.includes("com.raycast.macos.internal")) {
    return "raycastinternal";
  } else {
    return "raycast";
  }
}
