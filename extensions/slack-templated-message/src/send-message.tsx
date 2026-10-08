/**
 * Send message command that allows users to send messages using saved templates.
 * Supports editing, deleting templates and sending messages to threads.
 */
import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Keyboard, List, Toast, useNavigation } from "@raycast/api";
import { getAccessToken, showFailureToast, withAccessToken } from "@raycast/utils";
import { WebClient } from "@slack/web-api";
import { SlackTemplate } from "./types";
import { showCustomToast, slack, sendMessage, validateAndNormalizeThreadTs } from "./lib/slack";
import { loadTemplates, updateTemplate, deleteTemplate } from "./lib/templates";
import { useChannels, ChannelDropdown, ThreadField } from "./components/shared";

/**
 * Form component for editing existing templates
 * Allows users to modify template name, message, channel, and thread settings
 */
function EditTemplateForm({ template, onUpdate }: { template: SlackTemplate; onUpdate: () => void }) {
  const { channels, isLoading } = useChannels();
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update"
            onSubmit={async (values: {
              name: string;
              message: string;
              slackChannelId: string;
              threadTimestamp?: string;
            }) => {
              // Validate channel selection
              const selectedChannel = channels.find((c) => c.id === values.slackChannelId);
              if (!selectedChannel) {
                await showCustomToast({
                  style: Toast.Style.Failure,
                  title: "Channel Error",
                  message: "Selected channel not found",
                });
                return;
              }

              // Validate and normalize thread timestamp if provided
              let threadTs: string | undefined;
              if (values.threadTimestamp) {
                try {
                  const { token } = await getAccessToken();
                  if (!token) {
                    throw new Error("Failed to get authentication credentials");
                  }

                  const client = new WebClient(token);
                  threadTs = await validateAndNormalizeThreadTs(values.threadTimestamp, values.slackChannelId, client);
                } catch (error) {
                  await showCustomToast({
                    style: Toast.Style.Failure,
                    title: "Invalid thread",
                    message: error instanceof Error ? error.message : "Unknown error",
                  });
                  return;
                }
              }

              // Create updated template object
              const updatedTemplate: SlackTemplate = {
                name: values.name.trim(),
                message: values.message.trim(),
                slackChannelId: values.slackChannelId,
                slackChannelName: selectedChannel.name,
                threadTimestamp: threadTs,
              };

              try {
                await updateTemplate(updatedTemplate, template.name);
                onUpdate();
                await pop();
              } catch (error) {
                // Error is already handled by showToast
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Template Name" defaultValue={template.name} placeholder="Enter template name" />
      <Form.TextArea id="message" title="Message" defaultValue={template.message} placeholder="Enter message content" />
      <ChannelDropdown channels={channels} defaultValue={template.slackChannelId} />
      <ThreadField defaultValue={template.threadTimestamp} />
    </Form>
  );
}

function Command() {
  const [templates, setTemplates] = useState<SlackTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Loads all saved templates from storage
   */
  async function fetchTemplatesData() {
    try {
      const loadedTemplates = await loadTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : "Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }

  // Load templates when component mounts
  useEffect(() => {
    fetchTemplatesData();
  }, []);

  /**
   * Sends a message using the selected template
   * Handles authentication and message sending through Slack API
   */
  async function handleSendTemplatedMessage(template: SlackTemplate) {
    setIsLoading(true);
    try {
      const { token } = await getAccessToken();
      if (!token) {
        await showFailureToast("Failed to get authentication token");
        return;
      }
      await sendMessage(token, template.slackChannelId, template.message, template.threadTimestamp);
    } catch (error) {
      // Error toast is already handled in sendMessage function
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Deletes the selected template and updates the template list
   */
  async function handleDeleteTemplate(template: SlackTemplate) {
    try {
      const updatedTemplates = await deleteTemplate(template.name);
      setTemplates(updatedTemplates);
    } catch (error) {
      // Error is already handled in deleteTemplate
    }
  }

  // Render template list with actions for sending, editing, and deleting
  return (
    <List isLoading={isLoading}>
      {templates.map((template) => (
        <List.Item
          key={template.name}
          title={template.name}
          subtitle={`#${template.slackChannelName}${template.threadTimestamp ? " (Thread)" : ""}`}
          accessories={[
            {
              text: template.message.length > 50 ? template.message.slice(0, 50) + "..." : template.message,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Send"
                onAction={() => handleSendTemplatedMessage(template)}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
              <Action.Push
                title="Edit"
                target={<EditTemplateForm template={template} onUpdate={fetchTemplatesData} />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Delete"
                onAction={() => handleDeleteTemplate(template)}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToken(slack)(Command);
