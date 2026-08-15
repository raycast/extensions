import { Action, ActionPanel, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { parseMarkdown } from "./utils/parser";
import { cardToMarkdown } from "./utils/serializer";
import { saveCard } from "./utils/storage";
import { Flashcard } from "./types";

interface Props {
  card: Flashcard;
  onSaved?: () => void;
}

export default function EditCard({ card, onSaved }: Props) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { markdown: string }) {
    const input = values.markdown?.trim();

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Markdown input is empty",
        message: "Please provide some markdown content for the flashcard.",
      });
      return;
    }

    try {
      const parsed = parseMarkdown(input);

      if (!parsed.front) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Front side is empty",
          message: "Make sure the flashcard question comes before the == or ==< separator.",
        });
        return;
      }

      await saveCard({
        ...card,
        ...parsed,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Flashcard updated",
        message: `"${parsed.front}"`,
      });
      onSaved?.();
      pop();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update flashcard",
        message: String(e),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Edit Flashcard – ${card.front}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Flashcard" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} shortcut={Keyboard.Shortcut.Common.Pin} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="markdown"
        title="Markdown Content"
        defaultValue={cardToMarkdown(card)}
        placeholder="Write your flashcard using the Markdown syntax..."
        info="Edit the question, answer, options, or tags."
      />
    </Form>
  );
}
