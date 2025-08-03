import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { replaceText } from "./replace-text";
import { useFixSpelling } from "./useFixSpelling";

// Test words:  recieve, worlf

export default function Command() {
  const { list, word, error, isLoading, resetWord } = useFixSpelling();

  if (error) {
    return (
      <List>
        <List.EmptyView title={"Something went wrong"} description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Suggestions for: "${word}"`}>
      {list.length === 0 ? (
        <List.EmptyView title="No suggestions found" description="Try selecting a different word or phrase." />
      ) : (
        list.map((item) => (
          <List.Item
            key={item.id}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            actions={
              <ActionPanel>
                <Action
                  title="Replace Text"
                  icon={Icon.ThumbsUpFilled}
                  onAction={() => {
                    replaceText(typeof item.title === "string" ? item.title : item.title.value);
                    resetWord();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
