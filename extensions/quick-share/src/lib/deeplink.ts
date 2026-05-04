const EXTENSION_AUTHOR = "peinan";
const EXTENSION_NAME = "quick-share";

export type CommandName = "link-note" | "quick-note";

export type ChannelPresetContext = {
  channels: string[];
};

export function buildQuicklink(command: CommandName, context: ChannelPresetContext): string {
  const url = new URL(`raycast://extensions/${EXTENSION_AUTHOR}/${EXTENSION_NAME}/${command}`);
  url.searchParams.set("context", JSON.stringify(context));
  return url.toString();
}
