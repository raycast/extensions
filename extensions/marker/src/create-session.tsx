// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useMemo } from "react";

import {
  createMarkerSession,
  markerSettingsFromPreferences,
} from "./marker-api";
import { runWithToast } from "./marker-ui";

type CreateSessionValues = {
  title: string;
};

export default function Command() {
  const settings = useMemo(() => markerSettingsFromPreferences(), []);
  const { handleSubmit, itemProps } = useForm<CreateSessionValues>({
    async onSubmit(values) {
      const name = values.title.trim();
      const now = new Date().toISOString();

      await runWithToast({
        loadingTitle: "Creating session...",
        successTitle: "Session created",
        failureTitle: "Could not create session",
        closeMainWindowOnSuccess: true,
        task: async () => {
          await createMarkerSession({
            ...settings,
            name,
            clientID: randomUUID(),
            createdAt: now,
            updatedAt: now,
          });
        },
      });
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel title="Create Marker Session">
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Create Session"
              icon={Icon.PlusCircle}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Session Title"
        placeholder="Podcast, Livestream, Interview..."
        {...itemProps.title}
      />
    </Form>
  );
}
