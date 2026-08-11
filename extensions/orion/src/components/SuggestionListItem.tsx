import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { buildSearchUrl, getSearchEngineName } from "../utils";
import OpenInOrionAction from "./OpenInOrionAction";

const SuggestionListItem = (props: { suggestion: string }) => {
  const { suggestion } = props;
  return (
    <List.Item
      icon={Icon.MagnifyingGlass}
      title={suggestion}
      accessories={[{ text: getSearchEngineName() }]}
      actions={
        <ActionPanel>
          <OpenInOrionAction url={buildSearchUrl(suggestion)} title="Search in Orion" />
          <Action.CopyToClipboard
            title="Copy Suggestion"
            content={suggestion}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
};

export default SuggestionListItem;
