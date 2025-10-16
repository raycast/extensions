import { Form, ActionPanel, Action, showToast, Toast, Clipboard, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { richTextFromMarkdown } from "@contentful/rich-text-from-markdown";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import { fetchJiraTicket, buildMarkdownLink } from "./jira-service";

interface Preferences {
  jiraProjectKey: string;
}

export default function Command() {
  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit() {
    if (!ticketNumber || ticketNumber.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a ticket number",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Show loading toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching JIRA ticket...",
      });

      // Fetch ticket from JIRA
      const ticket = await fetchJiraTicket(ticketNumber.trim());

      // Build markdown string
      const preferences = getPreferenceValues<Preferences>();
      const markdownText = buildMarkdownLink(ticketNumber.trim(), ticket.title, ticket.url, preferences.jiraProjectKey);

      // Convert to rich text
      const document = await richTextFromMarkdown(markdownText);
      const html = documentToHtmlString(document);
      const plainText = documentToPlainTextString(document);

      // Copy and paste
      await Clipboard.copy({
        html: html,
        text: plainText,
      });
      await Clipboard.paste({
        html: html,
        text: plainText,
      });

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `${ticket.fullKey} converted and pasted`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch or convert ticket",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert and Paste" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ticketNumber"
        title="Ticket Number"
        placeholder="123"
        value={ticketNumber}
        onChange={setTicketNumber}
        info="Enter just the ticket number (e.g., 123 for SO-123)"
      />
    </Form>
  );
}
