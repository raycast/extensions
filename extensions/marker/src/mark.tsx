// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo } from "react";

import {
  createMarker,
  getCompleteMarkerIntegrationContext,
  listMarkerTags,
  markerSettingsFromPreferences,
  tagsForSession,
} from "./marker-api";
import {
  compareNewestSubsession,
  resolveActiveOrLatestSubsessionFromSummaries,
  sessionPickerSections,
  sortedSessionsForPicker,
} from "./marker-target";
import {
  dateWithOffset,
  offsetSeconds,
  optionalTrimmed,
  requiredString,
  runWithToast,
} from "./marker-ui";

const NO_SESSION_VALUE = "__marker_no_session__";
const LATEST_SUBSESSION_VALUE = "__marker_latest_subsession__";

type AddMarkerValues = {
  title?: string;
  description?: string;
  offset?: string;
  sessionID: string;
  subSessionID: string;
  tagIDs: string[];
};

export default function Command() {
  const settings = useMemo(() => markerSettingsFromPreferences(), []);
  const captureDate = useMemo(() => new Date(), []);
  const [sessionID, setSessionID] = useCachedState<string>(
    "add-marker:sessionID",
    NO_SESSION_VALUE,
  );
  const [subSessionID, setSubSessionID] = useCachedState<string>(
    "add-marker:subSessionID",
    LATEST_SUBSESSION_VALUE,
  );
  const [tagIDs, setTagIDs] = useCachedState<string[]>("add-marker:tagIDs", []);

  const contextState = useCachedPromise(
    getCompleteMarkerIntegrationContext,
    [settings],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load Marker context" },
    },
  );
  const context = contextState.data;
  const sessions = context?.sessions ?? [];
  const allSubsessions = context?.subsessions ?? [];
  const allTags = context?.tags ?? [];
  const activeSubsessions = context?.activeSubsessions ?? [];
  const pickerSessions = useMemo(
    () => sortedSessionsForPicker(sessions),
    [sessions],
  );
  const sessionSections = useMemo(
    () => sessionPickerSections(sessions),
    [sessions],
  );
  const selectedSessionID = realSessionID(sessionID);
  const tagState = useCachedPromise(
    async (settings, sessionID: string | undefined) =>
      sessionID ? listMarkerTags({ ...settings, sessionID }) : [],
    [settings, selectedSessionID],
    {
      failureToastOptions: { title: "Could not load Marker tags" },
    },
  );
  const subsessions = useMemo(
    () =>
      selectedSessionID
        ? allSubsessions
            .filter((subsession) => subsession.sessionID === selectedSessionID)
            .sort(compareNewestSubsession)
        : [],
    [allSubsessions, selectedSessionID],
  );
  const tags = useMemo(() => {
    if (tagState.data) {
      return tagState.data;
    }
    return tagsForSession(allTags, selectedSessionID);
  }, [allTags, selectedSessionID, tagState.data]);
  const visibleTagIDs = tagIDs.filter((tagID) =>
    tags.some((tag) => tag.id === tagID),
  );
  const { handleSubmit, itemProps } = useForm<AddMarkerValues>({
    onSubmit: submitMarker,
    validation: {
      offset: (value) => {
        try {
          offsetSeconds(value);
        } catch (error) {
          return error instanceof Error ? error.message : "Invalid offset.";
        }
      },
    },
  });

  useEffect(() => {
    if (!pickerSessions.length) {
      return;
    }
    if (
      !selectedSessionID ||
      !pickerSessions.some((session) => session.id === selectedSessionID)
    ) {
      setSessionID(pickerSessions[0].id);
      setSubSessionID(LATEST_SUBSESSION_VALUE);
      setTagIDs([]);
    }
  }, [
    selectedSessionID,
    pickerSessions,
    setSessionID,
    setSubSessionID,
    setTagIDs,
  ]);

  async function submitMarker(values: AddMarkerValues) {
    const name = optionalTrimmed(values.title) ?? "";
    const targetSessionID = requiredString(
      realSessionID(sessionID),
      "Select a session before adding a marker.",
    );
    const targetSubSessionID = resolveSubsessionID(
      targetSessionID,
      subSessionID,
      subsessions,
      activeSubsessions,
    );
    const selectedTagIDs = values.tagIDs.filter((tagID) =>
      tags.some((tag) => tag.id === tagID),
    );
    const markerDate = dateWithOffset(values.offset, captureDate).toISOString();
    const now = new Date().toISOString();

    await runWithToast({
      loadingTitle: "Adding marker...",
      successTitle: "Marker added",
      failureTitle: "Could not add marker",
      closeMainWindowOnSuccess: true,
      task: async () => {
        await createMarker({
          ...settings,
          name,
          note: optionalTrimmed(values.description),
          sessionID: targetSessionID,
          subSessionID: targetSubSessionID,
          tagIDs: selectedTagIDs,
          clientID: randomUUID(),
          date: markerDate,
          createdAt: now,
          updatedAt: now,
        });
      },
    });
  }

  return (
    <Form
      isLoading={contextState.isLoading || tagState.isLoading}
      actions={
        <ActionPanel title="Add Marker">
          <ActionPanel.Section>
            <Action.SubmitForm
              title="Add Marker"
              icon={Icon.PlusCircle}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Refresh">
            <Action
              title="Refresh Marker Data"
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
        title="Title"
        placeholder="Moment title"
        {...itemProps.title}
      />
      <Form.TextArea
        title="Description"
        placeholder="Optional note"
        {...itemProps.description}
      />
      <Form.TextField
        title="Offset"
        placeholder="-10s, 30s, 2m"
        {...itemProps.offset}
      />
      <Form.Dropdown
        id="sessionID"
        title="Session"
        value={sessionID}
        onChange={(value) => {
          setSessionID(value);
          setSubSessionID(LATEST_SUBSESSION_VALUE);
          setTagIDs([]);
        }}
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
      {!pickerSessions.length && !contextState.isLoading ? (
        <Form.Description text="No Marker sessions were loaded. Refresh Marker data or create a session before using this detailed form." />
      ) : null}
      <Form.Dropdown
        id="subSessionID"
        title="Sub-session"
        value={subSessionID}
        onChange={setSubSessionID}
      >
        <Form.Dropdown.Item
          value={LATEST_SUBSESSION_VALUE}
          title="Latest sub-session"
        />
        {subsessions.map((subsession) => (
          <Form.Dropdown.Item
            key={subsession.id}
            value={subsession.id}
            title={subsession.name}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="tagIDs"
        title="Tags"
        value={visibleTagIDs}
        onChange={setTagIDs}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function resolveSubsessionID(
  sessionID: string,
  selectedSubSessionID: string,
  subsessions: Awaited<
    ReturnType<typeof getCompleteMarkerIntegrationContext>
  >["subsessions"],
  activeSubsessions: Awaited<
    ReturnType<typeof getCompleteMarkerIntegrationContext>
  >["activeSubsessions"],
): string {
  if (selectedSubSessionID !== LATEST_SUBSESSION_VALUE) {
    return requiredString(
      selectedSubSessionID,
      "Select a sub-session before adding a marker.",
    );
  }

  const latestSubsession = resolveActiveOrLatestSubsessionFromSummaries(
    sessionID,
    subsessions,
    activeSubsessions,
  );
  if (!latestSubsession) {
    throw new Error("No sub-sessions found for the selected session.");
  }
  return latestSubsession.id;
}

function realSessionID(value: string | undefined): string | undefined {
  if (!value || value === NO_SESSION_VALUE) {
    return undefined;
  }
  return value;
}
