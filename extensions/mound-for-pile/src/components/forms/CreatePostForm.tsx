import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { HighlightI } from "../../utils/types";
import { useCallback } from "react";
import { PostHighlights } from "../../utils/types";

export function CreatePostForm({ onCreate }: { onCreate: (content: string, highlight: HighlightI) => void }) {
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    async (values: { content: string; highlight: string }) => {
      const highlightObj: HighlightI | undefined = PostHighlights.find(
        (highlight: HighlightI) => highlight.highlight === values.highlight,
      );
      onCreate(values.content, highlightObj || PostHighlights[0]);
      pop();
    },
    [onCreate, pop],
  );

  return (
    <Form
      //   enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Post" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="What Are You Thinking?" autoFocus />
      <Form.Dropdown id="highlight" title="Highlight" defaultValue="none">
        {PostHighlights.map((highlight: HighlightI) => (
          <Form.Dropdown.Item
            key={highlight.highlight}
            value={highlight.highlight}
            title={highlight.highlight}
            icon={{
              source: Icon.CircleFilled,
              tintColor: highlight.highlightColor === "transparent" ? "white" : highlight.highlightColor,
            }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
