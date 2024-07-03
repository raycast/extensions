import { List } from "@raycast/api";
import { ChangeDropdownPropType } from "../../type/chat";
import { SnippetGroupByCategory } from "../snippet/list";
import { TalkAssistantType, TalkSnippetType } from "../../type/talk";

export const ChatDropdown = (props: ChangeDropdownPropType) => {
  const { assistants, snippets, selectedAssistant, onAssistantChange, onSnippetChange } = props;
  const filtredSnippets = snippets.filter((snippet: TalkSnippetType) =>
    (selectedAssistant.snippet ? selectedAssistant.snippet.join(", ") : "").includes(snippet.snippetId)
  );

  return (
    <List.Dropdown
      tooltip="Select"
      storeValue={true}
      defaultValue={"assistant__" + selectedAssistant.assistantId}
      onChange={(value: string) => {
        const data = value.split("__");
        if (data[0] === "assistant") {
          const item = assistants.find((assistant: TalkAssistantType) => assistant.assistantId == data[1]);
          if (!item) return;
          onAssistantChange(item);
        } else if (data[0] === "snippet") {
          const item = snippets.find((snippet: TalkSnippetType) => snippet.snippetId == data[1]);
          if (!item) return;
          onSnippetChange(item);
        }
      }}
    >
      <>
        {Object.entries(SnippetGroupByCategory(filtredSnippets) as Record<string, TalkSnippetType[]>).map(
          ([name, list]) => (
            <List.Dropdown.Section key={name} title={name + " - Snippets"}>
              {list.map((snippet: TalkSnippetType) => (
                <List.Dropdown.Item
                  key={snippet.snippetId}
                  title={snippet.title}
                  value={"snippet__" + snippet.snippetId}
                  icon={snippet.emoji}
                />
              ))}
            </List.Dropdown.Section>
          )
        )}
      </>
      <List.Dropdown.Section title="Change to Assistant">
        {selectedAssistant && (
          <List.Dropdown.Item
            key={selectedAssistant.assistantId}
            title={selectedAssistant.title}
            value={"assistant__" + selectedAssistant.assistantId}
            icon={selectedAssistant.avatar}
          />
        )}
        {assistants
          .filter((assistant: TalkAssistantType) => assistant.assistantId !== selectedAssistant.assistantId)
          .map((assistant: TalkAssistantType) => (
            <List.Dropdown.Item
              key={assistant.assistantId}
              title={assistant.title}
              value={"assistant__" + assistant.assistantId}
              icon={assistant.avatar ?? assistant.emoji}
            />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
