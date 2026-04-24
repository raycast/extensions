/**
 * Fillerama — Generate Filler Headline command
 *
 * Displays a form to pick a show. On submit, fetches a headline,
 * pastes it into the active app, and closes Raycast.
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

export default function GenerateHeadline() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { show: ShowId }) {
    setIsLoading(true);

    try {
      const response = await fetchQuotes(values.show);
      const quotes = pickQuotes(response, 1, "headers");

      if (!quotes.length) throw new Error("No headlines returned for this show.");

      const headline = buildText(quotes);

      await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      await Clipboard.paste(headline);
    } catch (err) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch headline",
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
    </Form>
  );
}
