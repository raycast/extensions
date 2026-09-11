import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useState } from "react";
import { Flashcard } from "./types";
import { parseMultipleCards } from "./utils/parser";
import { saveCards } from "./utils/storage";
import { readFileSync } from "fs";

export default function ImportCards() {
  const [mode, setMode] = useState<string>("paste");

  async function handleSubmit(values: { markdown?: string; filePath?: string[] }) {
    let input = "";

    if (mode === "paste") {
      // Markdown text was pasted directly.
      input = values.markdown?.trim() ?? "";
    } else {
      // Read the selected file.
      const path = values.filePath?.[0];
      if (!path) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import Failed",
          message: "No file selected. Please choose a Markdown file to import.",
        });
        return;
      }
      try {
        input = readFileSync(path, "utf-8").trim();
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import Failed",
          message: String(e),
        });
        return;
      }
    }

    if (!input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: "No valid flashcards found to import.",
      });
      return;
    }

    try {
      const parsed = parseMultipleCards(input);

      if (parsed.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import Failed",
          message: "No valid flashcards found to import.",
        });
        return;
      }

      // Save all parsed cards in one storage operation.
      const importedCards: Flashcard[] = [];
      let savedCount = 0;
      for (const p of parsed) {
        // Only save cards with a front side.
        if (!p.front) continue;

        const card: Flashcard = {
          ...p,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          progress: "unanswered",
          createdAt: Date.now(),
        };
        importedCards.push(card);
        savedCount++;
      }
      await saveCards(importedCards);

      await showToast({
        style: Toast.Style.Success,
        title: "Import Successful",
        message:
          savedCount === 1 ? "1 flashcard imported successfully." : `${savedCount} flashcards imported successfully.`,
      });

      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: String(e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Flashcards" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* Import mode selection */}
      <Form.Dropdown id="mode" title="Import Source" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="paste" title="Paste Markdown" icon={Icon.TextCursor} />
        <Form.Dropdown.Item value="file" title="Select Markdown File" icon={Icon.Document} />
      </Form.Dropdown>

      <Form.Separator />

      {mode === "paste" ? (
        <Form.TextArea
          id="markdown"
          title="Markdown Text"
          placeholder="Paste your flashcard markdown here..."
          info="Paste the raw markdown content here. You can separate multiple cards with a line containing '---'."
        />
      ) : (
        <Form.FilePicker
          id="filePath"
          title="Markdown File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          canChooseFiles={true}
        />
      )}

      <Form.Separator />

      {/* Format reference */}
      <Form.Description
        title="Multiple Flashcards Syntax"
        text={[
          "── Standard ──",
          "What is the powerhouse of the cell?",
          "==",
          "Mitochondria",
          "#biology #school",
          "---",
          "",
          "── Multiple Choice ──",
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
    </Form>
  );
}
