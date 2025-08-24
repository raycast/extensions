import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

export default function EmojiForm({
  initialEmoji,
  onSubmit,
}: {
  initialEmoji?: string;
  onSubmit: (emoji?: string) => void;
}) {
  const navigation = useNavigation();
  const [emoji, setEmoji] = useState(initialEmoji ?? "");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => {
              onSubmit(emoji || undefined);
              navigation.pop();
            }}
            title="Save Emoji"
          />
          <Action title="Back" onAction={() => navigation.pop()} shortcut={{ modifiers: [], key: "backspace" }} />
        </ActionPanel>
      }
    >
      <Form.TextField id="emoji" title="Emoji" placeholder="e.g. ⭐" value={emoji} onChange={setEmoji} />
    </Form>
  );
}
