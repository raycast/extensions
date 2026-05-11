/**
 * Shared components and hooks for template management functionality.
 * Provides reusable UI components and data fetching logic.
 */
import React, { useState, useEffect } from "react";
import { Form } from "@raycast/api";
import { WebClient } from "@slack/web-api";
import { getAccessToken, showFailureToast } from "@raycast/utils";
import { Channel } from "../types";
import { fetchAllChannels } from "../lib/slack";

/**
 * Custom hook for fetching and managing Slack channels
 * Handles authentication and channel list retrieval
 * @returns Object containing channels array and loading state
 */
export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchChannels() {
      try {
        const { token } = await getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }
        const client = new WebClient(token);
        const allChannels = await fetchAllChannels(client);
        setChannels(allChannels);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch channels" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchChannels();
  }, []);

  return { channels, isLoading };
}

/**
 * Reusable dropdown component for selecting Slack channels
 * @param props.id - Form field ID
 * @param props.channels - Array of available channels
 * @param props.defaultValue - Pre-selected channel ID
 * @param props.placeholder - Placeholder text for the dropdown
 */
export function ChannelDropdown({
  id = "slackChannelId",
  channels,
  defaultValue,
  placeholder = "Select a channel",
}: {
  id?: string;
  channels: Channel[];
  defaultValue?: string;
  placeholder?: string;
}) {
  // Only use defaultValue if it exists in channels
  const validDefaultValue = channels.some((channel) => channel.id === defaultValue) ? defaultValue : undefined;

  return (
    <Form.Dropdown id={id} title="Channel" defaultValue={validDefaultValue} placeholder={placeholder}>
      {channels.map((channel) => (
        <Form.Dropdown.Item key={channel.id} value={channel.id} title={`#${channel.name}`} />
      ))}
    </Form.Dropdown>
  );
}

/**
 * Reusable text field component for thread ID input
 * Supports optional thread selection for message templates
 * @param props.id - Form field ID
 * @param props.defaultValue - Pre-filled thread ID
 */
export function ThreadField({ id = "threadTimestamp", defaultValue }: { id?: string; defaultValue?: string }) {
  return (
    <Form.TextField
      id={id}
      title="Thread ID (Optional)"
      defaultValue={defaultValue}
      placeholder="Enter thread timestamp Example: p1234567891234567"
    />
  );
}
