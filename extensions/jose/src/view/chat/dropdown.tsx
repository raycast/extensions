import { List } from "@raycast/api";
import { ChangeDropdownPropType } from "../../type/chat";
import { SnippetGroupByCategory } from "../snippet/list";
import { ITalkAssistant, ITalkSnippet } from "../../ai/type";

export const ChatDropdown = (props: ChangeDropdownPropType) => {
  const { assistants, snippets, selectedAssistant, onAssistantChange, onSnippetChange } = props;
  const filtredSnippets = snippets.filter((snippet: ITalkSnippet) =>
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
          const item = assistants.find((assistant: ITalkAssistant) => assistant.assistantId == data[1]);
          if (!item) return;
          onAssistantChange(item);
        } else if (data[0] === "snippet") {
          const item = snippets.find((snippet: ITalkSnippet) => snippet.snippetId == data[1]);
          if (!item) return;
          onSnippetChange(item);
        }
      }}
    >
      <>
        {Object.entries(SnippetGroupByCategory(filtredSnippets) as Record<string, ITalkSnippet[]>).map(
          ([name, list]) => (
            <List.Dropdown.Section key={name} title={name + " - Snippets"}>
              {list.map((snippet: ITalkSnippet) => (
                <List.Dropdown.Item
                  key={snippet.snippetId}
                  title={snippet.title}
                  value={"snippet__" + snippet.snippetId}
                  icon={{ source: snippet.emoji }}
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
            icon={selectedAssistant.avatar ? { source: selectedAssistant.avatar } : { source: selectedAssistant.emoji }}
          />
        )}
        {assistants
          .filter((assistant: ITalkAssistant) => assistant.assistantId !== selectedAssistant.assistantId)
          .map((assistant: ITalkAssistant) => (
            <List.Dropdown.Item
              key={assistant.assistantId}
              title={assistant.title}
              value={"assistant__" + assistant.assistantId}
              icon={assistant.avatar ? { source: assistant.avatar } : { source: assistant.emoji }}
            />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
