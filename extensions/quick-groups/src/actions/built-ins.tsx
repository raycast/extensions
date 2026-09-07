import { Action, Icon } from "@raycast/api";
import { expandHomePath, obsidianUrl, sshUrl } from "../action-targets";
import { registerAction } from "./registry";

registerAction({
  name: "open",
  title: "Open",
  icon: Icon.Globe,
  render: (target) => (
    <Action.Open title="Open" target={expandHomePath(target)} icon={Icon.Globe} />
  ),
});

registerAction({
  name: "ssh",
  title: "Connect with SSH",
  icon: Icon.Terminal,
  render: (target) => (
    <Action.Open title="Connect with SSH" target={sshUrl(target)} icon={Icon.Terminal} />
  ),
});

registerAction({
  name: "obsidian",
  title: "Open in Obsidian",
  icon: Icon.Document,
  render: (target) => (
    <Action.Open title="Open in Obsidian" target={obsidianUrl(target)} icon={Icon.Document} />
  ),
});

registerAction({
  name: "pwd",
  title: "Copy Password",
  icon: Icon.Lock,
  sensitive: true,
  render: (target) => (
    <Action.CopyToClipboard title="Copy Password" content={target} icon={Icon.Lock} />
  ),
});
