/**
 * Fillerama — Generate Filler Text command
 *
 * Displays a form to pick a show and sentence count. On submit, fetches
 * quotes, pastes the result into the active app, and closes Raycast.
 *
 * @version 1.0.0
 */

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  closeMainWindow,
  showToast,
  Toast,
  Clipboard,
  PopToRootType,
} from "@raycast/api";
import { useState } from "react";
import { buildText, fetchQuotes, pickQuotes, ShowId, SHOWS } from "./api";

export default function GenerateFiller() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { show: ShowId; count: string }) {
    const count = parseInt(values.count, 10);
    if (isNaN(count) || count < 1 || count > 30) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a number between 1 and 30." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchQuotes(values.show);
      const quotes = pickQuotes(response, count, "db");

      if (!quotes.length) throw new Error("No quotes returned for this show.");

      const text = buildText(quotes);

      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await Clipboard.paste(text);
    } catch (err) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch quotes",
        message: String(err),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate and Paste" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="show" title="Show" defaultValue="futurama">
        {SHOWS.map((show) => (
          <Form.Dropdown.Item key={show.id} value={show.id} title={show.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="count"
        title="Sentences"
        placeholder="5"
        defaultValue="5"
        info="Number of sentences to generate (1–30)."
      />
    </Form>
  );
}
