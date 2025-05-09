import { Form, ActionPanel, Action, open } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Define"
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={(values) => {
              // Open in browser instead of fetching
              const url = `https://worddirectory.app/words/${encodeURIComponent(values.word)}`;
              open(url);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="word" title="Word" placeholder="Enter a word to define..." autoFocus />
    </Form>
  );
}
