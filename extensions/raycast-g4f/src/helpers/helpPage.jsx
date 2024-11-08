import { Action, ActionPanel, Icon } from "@raycast/api";

const helpPages = {
  // paths to help pages
  aiChat: "https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-AI-Chat",
  customAICommands: "https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-Custom-AI-Commands",
  genImage: "https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-Generate-Images",
  localAPI: "https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-Manage-Custom-APIs",
  aiPresets: "https://github.com/XInTheDark/raycast-g4f/wiki/Help-page:-AI-Presets",
  default: "https://github.com/XInTheDark/raycast-g4f/blob/main/README.md",
};

export const help_action = (module_name = null) => {
  const path = module_name && helpPages[module_name] ? helpPages[module_name] : helpPages.default;
  return <Action.OpenInBrowser title="Help" icon={Icon.QuestionMark} url={path} />;
};

export const help_action_panel = (module_name = null) => {
  return <ActionPanel>{help_action(module_name)}</ActionPanel>;
};
