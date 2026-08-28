import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { parseMarkdown } from "./utils/parser";
import { saveCard } from "./utils/storage";
import { Flashcard } from "./types";

export default function CreateCard() {
  async function handleSubmit(values: { markdown: string }) {
    const input = values.markdown?.trim();

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Markdown input is empty",
        message: "Please provide some markdown content to create a flashcard.",
      });
      return;
    }

    try {
      const parsed = parseMarkdown(input);

      if (!parsed.front) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Front side is empty",
          message:
            "The card front cannot be determined. Make sure to separate front and back or options with == or ==<.",
        });
        return;
      }

      const card: Flashcard = {
        ...parsed,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        progress: "unanswered",
        createdAt: Date.now(),
      };

      await saveCard(card);
      await showToast({
        style: Toast.Style.Success,
        title: "Flashcard saved successfully",
        message: `"${card.front}"`,
      });
      // Close the form and return to the main view.
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse markdown",
        message: String(e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Flashcard" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="markdown"
        title="Markdown Content"
        placeholder="Write your flashcard here using the Markdown syntax below..."
        info="Use markdown format to write standard or multiple-choice flashcards."
      />
      <Form.Separator />

      {/* ── Standard card: steps ── */}
      <Form.Description
        title="Standard Flashcard Syntax"
        text={[
          "Standard Flashcard Syntax:",
          "1. Write the question (front side) on the first line.",
          "2. Add exactly '==' on a new line.",
          "3. Write the answer (back side) below it.",
          "4. Optionally, add tags at the very bottom (e.g., #biology #study).",
        ].join("\n")}
      />
      <Form.Description
        title="Example"
        text={["What is the powerhouse of the cell?", "==", "Mitochondria", "#biology #school"].join("\n")}
      />

      <Form.Separator />

      {/* ── Multiple-choice: steps ── */}
      <Form.Description
        title=""
        text={[
          "Multiple Choice Syntax:",
          "1. Write the question on the first line.",
          "2. Add exactly '==<' on a new line.",
          "3. List the options prefixed by numbers (e.g., '1: Option A').",
          "4. Add exactly '--' on a new line.",
          "5. Specify the correct answer (e.g., 'correct: 2').",
          "6. Optionally, add tags at the very bottom (e.g., #history).",
        ].join("\n")}
      />
      <Form.Description
        title="Example"
        text={[
          "In which year was the Treaty of Rome signed?",
          "==<",
          "1: 1945",
          "2: 1957",
          "3: 1993",
          "--",
          "correct: 2",
          "#history #politics",
        ].join("\n")}
      />

      <Form.Separator />

      {/* ── Tag categories ── */}
      <Form.Description
        title="Tags & Categories"
        text="To assign tags to a card, write them space-separated at the very bottom of the card starting with a hash symbol (e.g. #tag1 #tag2). Standardize on lowercase alphanumeric characters."
      />
    </Form>
  );
}
