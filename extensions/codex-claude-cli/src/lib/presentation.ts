import { Color, Icon, Image, List } from "@raycast/api";
import { ChatProvider, ChatSession } from "./types";

export function providerIcon(provider: ChatProvider): Image.ImageLike {
  return { source: provider === "claude" ? "claude.png" : "codex.png" };
}

export function providerMenuBarIcon(provider: ChatProvider): Image.ImageLike {
  return providerIcon(provider);
}

export function combinedProviderMenuBarIcon(): Image.ImageLike {
  return { source: "providers-menu-bar.png" };
}

export const liveIcon = { source: Icon.CircleFilled, tintColor: Color.Green };

export function sessionAccessories(session: ChatSession): List.Item.Accessory[] {
  const provider = session.provider === "claude" ? "Claude CLI" : "Codex CLI";
  const providerColor = session.provider === "claude" ? Color.Orange : Color.Blue;
  return [
    { tag: { value: provider, color: providerColor }, tooltip: `${provider} · ${session.projectName}` },
    ...(session.isActive ? [{ tag: { value: "Live", color: Color.Green }, icon: Icon.Bolt }] : []),
    { text: `${session.userMessageCount}`, icon: Icon.Message, tooltip: `${session.userMessageCount} prompts` },
    { date: new Date(session.updatedAt), tooltip: new Date(session.updatedAt).toLocaleString("en-US") },
  ];
}
