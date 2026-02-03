import { Icon, List } from "@raycast/api";
import type { FC } from "react";
import { useConfig } from "../../hooks";
import { formatHomePath } from "../../utils";
import { EmptyViewActionPanel } from "../actions";

type EmptyViewProps = {
  pattern: string;
};

export const messages = {
  START_TYPING_TITLE: "Start Typing...",
  NO_RESULTS_TITLE: "No Results Found",
  START_TYPING_DESCRIPTION: (location: string) =>
    `Type at least 3 characters to search\nSearching in: ${location}\n\nPress ⌘+L to change folder or ⌘+K for options`,
  NO_RESULTS_DESCRIPTION: (location: string) =>
    `No matches found.\nSearching in: ${location}\n\nPress ⌘+L to change folder or ⌘+K for more options`,
} as const;

export const EmptyView: FC<EmptyViewProps> = ({ pattern }) => {
  const { config, updateConfig } = useConfig();

  const isTyping = pattern.length < 3;
  const title = isTyping ? messages.START_TYPING_TITLE : messages.NO_RESULTS_TITLE;
  const searchLocation = formatHomePath(config.searchPath);
  const description = isTyping
    ? messages.START_TYPING_DESCRIPTION(searchLocation)
    : messages.NO_RESULTS_DESCRIPTION(searchLocation);

  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title={title}
      description={description}
      actions={<EmptyViewActionPanel config={config} onConfigChange={updateConfig} />}
    />
  );
};
