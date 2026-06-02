// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import {
  FormValidation,
  useCachedPromise,
  useCachedState,
  useForm,
} from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo } from "react";

import {
  createMarkerSubsession,
  getCompleteMarkerIntegrationContext,
  markerSettingsFromPreferences,
} from "./marker-api";
import {
  sessionPickerSections,
  sortedSessionsForPicker,
} from "./marker-target";
import { requiredString, runWithToast } from "./marker-ui";

const NO_SESSION_VALUE = "__marker_no_session__";

type CreateSubsessionValues = {
  parentSessionID: string;
  title: string;
};

export default function Command() {
  const settings = useMemo(() => markerSettingsFromPreferences(), []);
  const [parentSessionID, setParentSessionID] = useCachedState<string>(
    "create-subsession:parentSessionID",
    NO_SESSION_VALUE,
  );
  const contextState = useCachedPromise(
    getCompleteMarkerIntegrationContext,
    [settings],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load Marker context" },
    },
  );
  const sessions = contextState.data?.sessions ?? [];
  const pickerSessions = useMemo(
    () => sortedSessionsForPicker(sessions),
    [sessions],
  );
  const sessionSections = useMemo(
    () => sessionPickerSections(sessions),
    [sessions],
  );
  const selectedSessionID = realValue(parentSessionID);

  useEffect(() => {
    if (!pickerSessions.length) {
      return;
    }
    if (
      !selectedSessionID ||
      !pickerSessions.some((session) => session.id === selectedSessionID)
    ) {
      setParentSessionID(pickerSessions[0].id);
    }
  }, [selectedSessionID, pickerSessions, setParentSessionID]);

  const { handleSubmit, itemProps } = useForm<CreateSubsessionValues>({
    async onSubmit(values) {
      const name = requiredString(
        values.title,
        "Sub-session title is required.",
      );
      const sessionID = requiredString(
        realValue(parentSessionID),
        "Select a session before creating a sub-session.",
      );
      const nowDate = new Date();
      const now = nowDate.toISOString();

      await runWithToast({
        loadingTitle: "Creating sub-session...",
        successTitle: "Sub-session created",
        failureTitle: "Could not create sub-session",
        closeMainWindowOnSuccess: true,
        task: async () => {
          await createMarkerSubsession({
            ...settings,
            sessionID,
            name,
            clientID: randomUUID(),
            createdAt: now,
            updatedAt: now,
            lastStartTime: nowDate.getTime() / 1000,
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
      isLoading={contextState.isLoading}
      actions={
        <ActionPanel title="Create Marker Sub-Session">
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Create Sub-Session"
              icon={Icon.PlusCircle}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Refresh">
            <Action
              title="Refresh Sessions"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                void contextState.revalidate();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Sub-Session Title"
        placeholder="Segment, chapter, take..."
        {...itemProps.title}
      />
      {!pickerSessions.length && !contextState.isLoading ? (
        <Form.Description text="No Marker sessions were loaded. Create a session first, then refresh sessions here." />
      ) : null}
      <Form.Dropdown
        id="parentSessionID"
        title="Session"
        value={parentSessionID}
        onChange={setParentSessionID}
      >
        {pickerSessions.length ? (
          <>
            {sessionSections.active.length ? (
              <Form.Dropdown.Section title="Active Sessions">
                {sessionSections.active.map((session) => (
                  <Form.Dropdown.Item
                    key={session.id}
                    value={session.id}
                    title={session.name}
                  />
                ))}
              </Form.Dropdown.Section>
            ) : null}
            {sessionSections.inactive.length ? (
              <Form.Dropdown.Section title="Inactive Sessions">
                {sessionSections.inactive.map((session) => (
                  <Form.Dropdown.Item
                    key={session.id}
                    value={session.id}
                    title={session.name}
                  />
                ))}
              </Form.Dropdown.Section>
            ) : null}
          </>
        ) : (
          <Form.Dropdown.Item
            value={NO_SESSION_VALUE}
            title="No sessions loaded"
          />
        )}
      </Form.Dropdown>
    </Form>
  );
}

function realValue(value: string | undefined): string | undefined {
  if (!value || value === NO_SESSION_VALUE) {
    return undefined;
  }
  return value;
}
