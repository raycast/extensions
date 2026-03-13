/**
 * Create template command that allows users to create new message templates.
 * Supports variable substitution and thread reply functionality.
 */
import React from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { getAccessToken, showFailureToast, withAccessToken } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import { SlackTemplate } from "./types";
import { validateAndNormalizeThreadTs, slack } from "./lib/slack";
import { loadTemplates, saveTemplates } from "./lib/templates";
import { useChannels, ChannelDropdown, ThreadField } from "./components/shared";

function Command() {
  // Use shared hook to fetch and manage channels
  const { channels, isLoading } = useChannels();

  /**
   * Handles the template creation:
   * 1. Validates required fields
   * 2. Normalizes thread timestamp if provided
   * 3. Checks for duplicate template names
   * 4. Creates and saves the new template
   */
  async function handleSubmit(values: {
    name: string;
    message: string;
    slackChannelId: string;
    threadTimestamp?: string;
  }) {
    // Validate required fields
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a template name",
      });
      return;
    }

    if (!values.message.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a message",
      });
      return;
    }

    if (!values.slackChannelId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a channel",
      });
      return;
    }

    try {
      // Initialize Slack client
      const { token } = await getAccessToken();
      if (!token) {
        await showFailureToast("Failed to get authentication credentials");
        return;
      }

      const client = new WebClient(token);

      // Validate and normalize thread timestamp if provided
      let threadTimestamp = values.threadTimestamp?.trim();
      if (threadTimestamp) {
        threadTimestamp = await validateAndNormalizeThreadTs(threadTimestamp, values.slackChannelId, client);
      }

      // Check for duplicate template names
      const savedTemplates = await loadTemplates();
      if (savedTemplates.some((t) => t.name === values.name.trim())) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Template with the same name already exists",
          message: "Please specify a different name",
        });
        return;
      }

      // Validate channel selection
      const selectedChannel = channels.find((c) => c.id === values.slackChannelId);
      if (!selectedChannel) {
        throw new Error("Selected channel not found");
      }

      // Create and save new template
      const newTemplate: SlackTemplate = {
        name: values.name.trim(),
        message: values.message.trim(),
        slackChannelId: values.slackChannelId,
        slackChannelName: selectedChannel.name,
        threadTimestamp: threadTimestamp,
      };

      await saveTemplates([...savedTemplates, newTemplate]);
      await showToast({
        style: Toast.Style.Success,
        title: "Template created successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create template",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Render template creation form with channel selection and variable documentation
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Template Name" placeholder="Enter the name of the template" />
      <Form.TextArea id="message" title="Message" placeholder="Enter your message template" />
      <ChannelDropdown channels={channels} />
      <ThreadField />
      <Form.Description
        text="Available variables for the message template:
{date} - Date (YYYY-MM-DD)
{time} - Time (HH:mm)
{user} - User Name"
      />
    </Form>
  );
}

export default withAccessToken(slack)(Command);
