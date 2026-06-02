// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import {
  FormValidation,
  useCachedPromise,
  useCachedState,
  useForm,
} from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo, useState } from "react";

import {
  MarkerApiError,
  MarkerSessionSummary,
  MarkerSettings,
  MarkerSubsessionSummary,
  MarkerTagSummary,
  MarkerTimelineItemSummary,
  createChapterMarker,
  createMarker,
  deleteChapterMarker,
  deleteMarker,
  getCompleteMarkerIntegrationContext,
  listMarkerTags,
  listTimeline,
  markerSettingsFromPreferences,
  tagsForSession,
  updateChapterMarker,
  updateMarker,
} from "./marker-api";
import {
  compareNewestSubsession,
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
const ALL_CHAPTERS_VALUE = "__marker_all_chapters__";

type TimelineItem =
  | {
      kind: "marker";
      id: string;
      sessionID: string;
      subSessionID: string;
      title: string;
      date: string;
      note?: string;
      endDate?: string;
      tagIDs: string[];
    }
  | {
      kind: "chapter";
      id: string;
      sessionID: string;
      subSessionID: string;
      title: string;
      date: string;
      tagIDs: string[];
    };

type AddMarkerValues = {
  title?: string;
  description?: string;
  offset?: string;
  tagIDs: string[];
};

type AddChapterValues = {
  title: string;
  offset?: string;
  tagIDs: string[];
};

type EditTimelineItemValues = {
  title?: string;
  note?: string;
  date: Date | null;
  subSessionID: string;
  tagIDs: string[];
};

export default function Command() {
  const settings = useMemo(() => markerSettingsFromPreferences(), []);
  const [sessionID, setSessionID] = useCachedState<string>(
    "recent-markers:sessionID",
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
  const context = contextState.data;
  const sessions = context?.sessions ?? [];
  const allSubsessions = context?.subsessions ?? [];
  const allTags = context?.tags ?? [];
  const pickerSessions = useMemo(
    () => sortedSessionsForPicker(sessions),
    [sessions],
  );
  const sessionSections = useMemo(
    () => sessionPickerSections(sessions),
    [sessions],
  );
  const selectedSessionID = realValue(sessionID);
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
  const selectedSessionValue = selectedSession(sessions, selectedSessionID);
  const tags = useMemo(() => {
    if (tagState.data) {
      return tagState.data;
    }
    return tagsForSession(allTags, selectedSessionID);
  }, [allTags, selectedSessionID, tagState.data]);

  useEffect(() => {
    if (!pickerSessions.length) {
      return;
    }
    if (
      !selectedSessionID ||
      !pickerSessions.some((session) => session.id === selectedSessionID)
    ) {
      setSessionID(pickerSessions[0].id);
    }
  }, [selectedSessionID, pickerSessions, setSessionID]);

  const refresh = () => {
    void contextState.revalidate();
  };

  return (
    <List
      isLoading={contextState.isLoading || tagState.isLoading}
      searchBarPlaceholder="Search sub-sessions"
      emptyView={
        <List.EmptyView
          icon={Icon.Clock}
          title={selectedSessionID ? "No Sub-Sessions" : "No Marker Sessions"}
          description={
            selectedSessionID
              ? "No sub-sessions were found for the selected session. Create a sub-session in Marker, then refresh."
              : "No Marker sessions were loaded. Check your token or create a session, then refresh."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Sessions"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Session"
          value={sessionID}
          onChange={setSessionID}
        >
          {pickerSessions.length ? (
            <>
              {sessionSections.active.length ? (
                <List.Dropdown.Section title="Active Sessions">
                  {sessionSections.active.map((session) => (
                    <List.Dropdown.Item
                      key={session.id}
                      title={session.name}
                      value={session.id}
                    />
                  ))}
                </List.Dropdown.Section>
              ) : null}
              {sessionSections.inactive.length ? (
                <List.Dropdown.Section title="Inactive Sessions">
                  {sessionSections.inactive.map((session) => (
                    <List.Dropdown.Item
                      key={session.id}
                      title={session.name}
                      value={session.id}
                    />
                  ))}
                </List.Dropdown.Section>
              ) : null}
            </>
          ) : (
            <List.Dropdown.Item
              title="No sessions loaded"
              value={NO_SESSION_VALUE}
            />
          )}
        </List.Dropdown>
      }
    >
      <List.Section title={selectedSessionValue?.name ?? "Sub-Sessions"}>
        {subsessions.map((subsession) => (
          <List.Item
            key={subsession.id}
            title={subsession.name}
            subtitle={displaySubsessionDate(subsession)}
            accessories={[
              ...(subsession.status ? [{ text: subsession.status }] : []),
              {
                icon: {
                  source: Icon.Clock,
                  tintColor: Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel title={subsession.name}>
                <Action.Push
                  title="Open"
                  icon={Icon.List}
                  target={
                    <SubsessionTimelineView
                      settings={settings}
                      session={selectedSessionValue}
                      subsession={subsession}
                      tags={tags}
                      sessions={sessions}
                      allSubsessions={allSubsessions}
                      allTags={allTags}
                      sessionSections={sessionSections}
                      setSessionID={setSessionID}
                      refreshContext={refresh}
                    />
                  }
                />
                <ActionPanel.Section title="Insert">
                  {selectedSessionValue ? (
                    <>
                      <Action.Push
                        title="Add Marker"
                        icon={Icon.PlusCircle}
                        target={
                          <AddMarkerForm
                            settings={settings}
                            session={selectedSessionValue}
                            subsession={subsession}
                            tags={tags}
                            onDone={refresh}
                          />
                        }
                      />
                      <Action.Push
                        title="Add Chapter Marker"
                        icon={Icon.Bookmark}
                        target={
                          <AddChapterMarkerForm
                            settings={settings}
                            session={selectedSessionValue}
                            subsession={subsession}
                            tags={tags}
                            onDone={refresh}
                          />
                        }
                      />
                    </>
                  ) : null}
                </ActionPanel.Section>
                <RootDataActions refresh={refresh} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SubsessionTimelineView(props: {
  settings: MarkerSettings;
  session?: MarkerSessionSummary;
  subsession: MarkerSubsessionSummary;
  tags: MarkerTagSummary[];
  sessions: MarkerSessionSummary[];
  allSubsessions: MarkerSubsessionSummary[];
  allTags: MarkerTagSummary[];
  sessionSections: ReturnType<typeof sessionPickerSections>;
  setSessionID: (value: string) => void;
  refreshContext: () => void;
}) {
  const [chapterFilterID, setChapterFilterID] = useCachedState<string>(
    `recent-markers:chapterFilterID:${props.subsession.id}`,
    ALL_CHAPTERS_VALUE,
  );
  const markersState = useCachedPromise(
    loadTimeline,
    [props.settings, props.subsession.id],
    {
      keepPreviousData: true,
      initialData: [],
      failureToastOptions: { title: "Could not load Marker history" },
    },
  );
  const timeline = markersState.data ?? [];
  const chapters = useMemo(
    () => timeline.filter((item) => item.kind === "chapter"),
    [timeline],
  );
  const filteredTimeline = useMemo(
    () => filterTimelineByChapter(timeline, realChapterValue(chapterFilterID)),
    [timeline, chapterFilterID],
  );

  useEffect(() => {
    if (
      chapterFilterID === ALL_CHAPTERS_VALUE ||
      chapters.some((chapter) => chapter.id === chapterFilterID)
    ) {
      return;
    }
    setChapterFilterID(ALL_CHAPTERS_VALUE);
  }, [chapterFilterID, chapters, setChapterFilterID]);

  const refresh = () => {
    props.refreshContext();
    void markersState.revalidate();
  };

  return (
    <List
      isLoading={markersState.isLoading}
      navigationTitle={props.subsession.name}
      emptyView={
        <List.EmptyView
          icon={Icon.List}
          title="No Markers Yet"
          description="This sub-session does not have markers or chapter markers yet."
          actions={
            <ActionPanel>
              {props.session ? (
                <>
                  <Action.Push
                    title="Add Marker"
                    icon={Icon.PlusCircle}
                    target={
                      <AddMarkerForm
                        settings={props.settings}
                        session={props.session}
                        subsession={props.subsession}
                        tags={props.tags}
                        onDone={refresh}
                      />
                    }
                  />
                  <Action.Push
                    title="Add Chapter Marker"
                    icon={Icon.Bookmark}
                    target={
                      <AddChapterMarkerForm
                        settings={props.settings}
                        session={props.session}
                        subsession={props.subsession}
                        tags={props.tags}
                        onDone={refresh}
                      />
                    }
                  />
                </>
              ) : null}
              <Action
                title="Refresh History"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      }
    >
      <List.Section
        title={timelineSectionTitle(
          props.subsession,
          chapterFilterID,
          chapters,
        )}
      >
        {filteredTimeline.map((item) => (
          <List.Item
            key={`${item.kind}:${item.id}`}
            title={displayTimelineTitle(item)}
            subtitle={displayDate(item.date)}
            accessories={[
              ...(item.tagIDs.length
                ? [{ text: `${item.tagIDs.length} tags` }]
                : []),
              {
                icon: {
                  source: item.kind === "chapter" ? Icon.Bookmark : Icon.Dot,
                  tintColor:
                    item.kind === "chapter" ? Color.Blue : Color.PrimaryText,
                },
              },
            ]}
            detail={<List.Item.Detail markdown={detailMarkdown(item)} />}
            actions={
              <HistoryActionPanel
                settings={props.settings}
                session={props.session}
                subsession={props.subsession}
                tags={props.tags}
                item={item}
                chapters={chapters}
                chapterFilterID={chapterFilterID}
                setChapterFilterID={setChapterFilterID}
                sessions={props.sessions}
                allSubsessions={props.allSubsessions}
                allTags={props.allTags}
                sessionSections={props.sessionSections}
                setSessionID={props.setSessionID}
                refresh={refresh}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function RootDataActions(props: { refresh: () => void }) {
  return (
    <ActionPanel.Section title="Refresh">
      <Action
        title="Refresh Sessions"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={props.refresh}
      />
    </ActionPanel.Section>
  );
}

function HistoryActionPanel(props: {
  settings: MarkerSettings;
  session?: MarkerSessionSummary;
  subsession?: MarkerSubsessionSummary;
  tags: MarkerTagSummary[];
  chapters: TimelineItem[];
  chapterFilterID: string;
  setChapterFilterID: (value: string) => void;
  sessions: MarkerSessionSummary[];
  allSubsessions: MarkerSubsessionSummary[];
  allTags: MarkerTagSummary[];
  item?: TimelineItem;
  sessionSections: ReturnType<typeof sessionPickerSections>;
  setSessionID: (value: string) => void;
  refresh: () => void;
}) {
  return (
    <ActionPanel title={props.item?.title ?? "Marker History"}>
      {props.session && props.subsession ? (
        <ActionPanel.Section title="Insert">
          <Action.Push
            title="Add Marker"
            icon={Icon.PlusCircle}
            target={
              <AddMarkerForm
                settings={props.settings}
                session={props.session}
                subsession={props.subsession}
                tags={props.tags}
                onDone={props.refresh}
              />
            }
          />
          <Action.Push
            title="Add Chapter Marker"
            icon={Icon.Bookmark}
            target={
              <AddChapterMarkerForm
                settings={props.settings}
                session={props.session}
                subsession={props.subsession}
                tags={props.tags}
                onDone={props.refresh}
              />
            }
          />
        </ActionPanel.Section>
      ) : null}
      {props.item ? (
        <TimelineItemActions
          settings={props.settings}
          item={props.item}
          sessions={props.sessions}
          allSubsessions={props.allSubsessions}
          allTags={props.allTags}
          refresh={props.refresh}
        />
      ) : null}
      <ActionPanel.Section title="Filter">
        <ActionPanel.Submenu title="Filter by Chapter…" icon={Icon.Bookmark}>
          <Action
            title="All Chapters"
            icon={
              props.chapterFilterID === ALL_CHAPTERS_VALUE
                ? Icon.CheckCircle
                : Icon.Circle
            }
            onAction={() => {
              props.setChapterFilterID(ALL_CHAPTERS_VALUE);
            }}
          />
          {props.chapters.map((chapter) => (
            <Action
              key={chapter.id}
              title={chapter.title}
              subtitle={displayDate(chapter.date)}
              icon={
                props.chapterFilterID === chapter.id
                  ? Icon.CheckCircle
                  : Icon.Bookmark
              }
              onAction={() => {
                props.setChapterFilterID(chapter.id);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionPanel.Submenu title="Switch Session…" icon={Icon.Clock}>
          {props.sessionSections.active.length ? (
            <ActionPanel.Section title="Active Sessions">
              {props.sessionSections.active.map((session) => (
                <Action
                  key={session.id}
                  title={session.name}
                  icon={Icon.Play}
                  onAction={() => {
                    props.setSessionID(session.id);
                    props.setChapterFilterID(ALL_CHAPTERS_VALUE);
                  }}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
          {props.sessionSections.inactive.length ? (
            <ActionPanel.Section title="Inactive Sessions">
              {props.sessionSections.inactive.map((session) => (
                <Action
                  key={session.id}
                  title={session.name}
                  icon={Icon.Circle}
                  onAction={() => {
                    props.setSessionID(session.id);
                    props.setChapterFilterID(ALL_CHAPTERS_VALUE);
                  }}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section title="Refresh">
        <Action
          title="Refresh History"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={props.refresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function TimelineItemActions(props: {
  settings: MarkerSettings;
  item: TimelineItem;
  sessions: MarkerSessionSummary[];
  allSubsessions: MarkerSubsessionSummary[];
  allTags: MarkerTagSummary[];
  refresh: () => void;
}) {
  return (
    <>
      <ActionPanel.Section title="Edit">
        <Action.Push
          title={`Edit ${props.item.kind === "chapter" ? "Chapter Marker" : "Marker"}`}
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <EditTimelineItemForm
              settings={props.settings}
              item={props.item}
              sessions={props.sessions}
              allSubsessions={props.allSubsessions}
              allTags={props.allTags}
              onDone={props.refresh}
            />
          }
        />
        <Action
          title={`Delete ${props.item.kind === "chapter" ? "Chapter Marker" : "Marker"}`}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={() => {
            void deleteTimelineItem(props.settings, props.item, props.refresh);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Title"
          icon={Icon.Clipboard}
          content={props.item.title}
        />
        <Action.CopyToClipboard
          title="Copy Timestamp"
          icon={Icon.Clipboard}
          content={props.item.date}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
        {props.item.kind === "marker" && props.item.note ? (
          <Action.CopyToClipboard
            title="Copy Description"
            icon={Icon.Clipboard}
            content={props.item.note}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
        ) : null}
        <Action.CopyToClipboard
          title="Copy ID"
          icon={Icon.Clipboard}
          content={props.item.id}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </>
  );
}

function AddMarkerForm(props: {
  settings: MarkerSettings;
  session: MarkerSessionSummary;
  subsession: MarkerSubsessionSummary;
  tags: MarkerTagSummary[];
  onDone: () => void;
}) {
  const captureDate = useMemo(() => new Date(), []);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<AddMarkerValues>({
    async onSubmit(values) {
      const name = optionalTrimmed(values.title) ?? "";
      const markerDate = dateWithOffset(
        values.offset,
        captureDate,
      ).toISOString();
      const now = new Date().toISOString();
      await runWithToast({
        loadingTitle: "Adding marker...",
        successTitle: "Marker added",
        failureTitle: "Could not add marker",
        task: async () => {
          await createMarker({
            ...props.settings,
            name,
            note: optionalTrimmed(values.description),
            sessionID: props.session.id,
            subSessionID: props.subsession.id,
            tagIDs: values.tagIDs.filter((tagID) =>
              props.tags.some((tag) => tag.id === tagID),
            ),
            clientID: randomUUID(),
            date: markerDate,
            createdAt: now,
            updatedAt: now,
          });
          props.onDone();
          pop();
        },
      });
    },
    validation: {
      offset: offsetValidation,
    },
  });

  return (
    <Form
      navigationTitle="Add Marker"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Marker"
            icon={Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
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
      <Form.TagPicker id="tagIDs" title="Tags" {...itemProps.tagIDs}>
        {props.tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function AddChapterMarkerForm(props: {
  settings: MarkerSettings;
  session: MarkerSessionSummary;
  subsession: MarkerSubsessionSummary;
  tags: MarkerTagSummary[];
  onDone: () => void;
}) {
  const captureDate = useMemo(() => new Date(), []);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<AddChapterValues>({
    async onSubmit(values) {
      const name = requiredString(
        values.title,
        "Chapter marker title is required.",
      );
      const startDate = dateWithOffset(
        values.offset,
        captureDate,
      ).toISOString();
      const now = new Date().toISOString();
      await runWithToast({
        loadingTitle: "Adding chapter marker...",
        successTitle: "Chapter marker added",
        failureTitle: "Could not add chapter marker",
        task: async () => {
          await createChapterMarker({
            ...props.settings,
            name,
            sessionID: props.session.id,
            subSessionID: props.subsession.id,
            tagIDs: values.tagIDs.filter((tagID) =>
              props.tags.some((tag) => tag.id === tagID),
            ),
            clientID: randomUUID(),
            startDate,
            createdAt: now,
            updatedAt: now,
          });
          props.onDone();
          pop();
        },
      });
    },
    validation: {
      title: FormValidation.Required,
      offset: offsetValidation,
    },
  });

  return (
    <Form
      navigationTitle="Add Chapter Marker"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Chapter Marker"
            icon={Icon.Bookmark}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Chapter title"
        {...itemProps.title}
      />
      <Form.TextField
        title="Offset"
        placeholder="-10s, 30s, 2m"
        {...itemProps.offset}
      />
      <Form.TagPicker id="tagIDs" title="Tags" {...itemProps.tagIDs}>
        {props.tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function EditTimelineItemForm(props: {
  settings: MarkerSettings;
  item: TimelineItem;
  sessions: MarkerSessionSummary[];
  allSubsessions: MarkerSubsessionSummary[];
  allTags: MarkerTagSummary[];
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  const [sessionID, setSessionID] = useState<string>(props.item.sessionID);
  const selectedSessionID = realValue(sessionID) ?? props.item.sessionID;
  const tagState = useCachedPromise(
    async (settings, sessionID: string | undefined) =>
      sessionID ? listMarkerTags({ ...settings, sessionID }) : [],
    [props.settings, selectedSessionID],
    {
      failureToastOptions: { title: "Could not load Marker tags" },
    },
  );
  const sessionSections = useMemo(
    () => sessionPickerSections(props.sessions),
    [props.sessions],
  );
  const subsessions = useMemo(
    () =>
      props.allSubsessions
        .filter((subsession) => subsession.sessionID === selectedSessionID)
        .sort(compareNewestSubsession),
    [props.allSubsessions, selectedSessionID],
  );
  const tags = useMemo(() => {
    if (tagState.data) {
      return tagState.data;
    }
    return tagsForSession(props.allTags, selectedSessionID);
  }, [props.allTags, selectedSessionID, tagState.data]);
  const initialTagIDs = props.item.tagIDs.filter(
    (tagID) => !tags.length || tags.some((tag) => tag.id === tagID),
  );
  const { handleSubmit, itemProps } = useForm<EditTimelineItemValues>({
    initialValues: {
      title: props.item.title,
      note: props.item.kind === "marker" ? props.item.note : undefined,
      date: dateValue(props.item.date),
      subSessionID: props.item.subSessionID,
      tagIDs: initialTagIDs,
    },
    async onSubmit(values) {
      const name =
        props.item.kind === "chapter"
          ? requiredString(values.title, "Chapter marker title is required.")
          : (optionalTrimmed(values.title) ?? "");
      const eventDate = normalizedDateString(
        values.date,
        props.item.kind === "chapter" ? "Start date" : "Timestamp",
      );
      const now = new Date().toISOString();
      const destinationSessionID = requiredString(
        realValue(sessionID),
        "Select a destination session.",
      );
      const destinationSubSessionID = requiredString(
        values.subSessionID,
        "Select a destination sub-session.",
      );
      const destinationTagIDs = values.tagIDs.filter((tagID) =>
        tags.some((tag) => tag.id === tagID),
      );

      await runWithToast({
        loadingTitle: "Saving...",
        successTitle: "Saved",
        failureTitle: "Could not save",
        task: async () => {
          if (props.item.kind === "chapter") {
            await updateChapterMarker({
              ...props.settings,
              id: props.item.id,
              name,
              startDate: eventDate,
              sessionID: destinationSessionID,
              subSessionID: destinationSubSessionID,
              tagIDs: destinationTagIDs,
              updatedAt: now,
            });
          } else {
            await updateMarker({
              ...props.settings,
              id: props.item.id,
              name,
              note: optionalTrimmed(values.note) ?? null,
              date: eventDate,
              sessionID: destinationSessionID,
              subSessionID: destinationSubSessionID,
              tagIDs: destinationTagIDs,
              updatedAt: now,
            });
          }
          props.onDone();
          pop();
        },
      });
    },
    validation: {
      title: (value) =>
        props.item.kind === "chapter" && !optionalTrimmed(value)
          ? "Chapter marker title is required."
          : undefined,
      date: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={tagState.isLoading}
      navigationTitle={`Edit ${props.item.kind === "chapter" ? "Chapter Marker" : "Marker"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      {props.item.kind === "marker" ? (
        <Form.TextArea
          title="Description"
          placeholder="Optional note"
          {...itemProps.note}
        />
      ) : null}
      <Form.DatePicker
        id="date"
        title={props.item.kind === "chapter" ? "Start Date" : "Timestamp"}
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.date}
      />
      <Form.Dropdown
        id="sessionID"
        title="Destination Session"
        value={sessionID}
        onChange={(value) => {
          setSessionID(value);
          const nextSubsession = props.allSubsessions
            .filter((subsession) => subsession.sessionID === value)
            .sort(compareNewestSubsession)[0];
          itemProps.subSessionID.onChange(nextSubsession?.id ?? "");
          itemProps.tagIDs.onChange([]);
        }}
      >
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
      </Form.Dropdown>
      <Form.Dropdown
        id="subSessionID"
        title="Destination Sub-session"
        {...itemProps.subSessionID}
      >
        {subsessions.map((subsession) => (
          <Form.Dropdown.Item
            key={subsession.id}
            value={subsession.id}
            title={subsession.name}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tagIDs" title="Tags" {...itemProps.tagIDs}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

async function deleteTimelineItem(
  settings: MarkerSettings,
  item: TimelineItem,
  refresh: () => void,
) {
  const confirmed = await confirmAlert({
    title: `Delete ${item.kind === "chapter" ? "Chapter Marker" : "Marker"}?`,
    message: item.title,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) {
    return;
  }

  await runWithToast({
    loadingTitle: "Deleting...",
    successTitle: "Deleted",
    failureTitle: "Could not delete",
    task: async () => {
      if (item.kind === "chapter") {
        await deleteChapterMarker({ ...settings, id: item.id });
      } else {
        await deleteMarker({ ...settings, id: item.id });
      }
      refresh();
    },
  });
}

async function loadTimeline(
  settings: ReturnType<typeof markerSettingsFromPreferences>,
  subSessionID: string | undefined,
): Promise<TimelineItem[]> {
  if (!subSessionID) {
    return [];
  }
  try {
    const timeline = await listTimeline({ ...settings, subSessionID });
    return timeline
      .map(timelineItem)
      .sort((lhs, rhs) => Date.parse(rhs.date) - Date.parse(lhs.date));
  } catch (error) {
    if (error instanceof MarkerApiError && error.status === 403) {
      throw new Error(
        "Marker History requires markers:read and chapterMarkers:read. Create a new Raycast token with the recommended scopes.",
      );
    }
    throw error;
  }
}

function timelineItem(item: MarkerTimelineItemSummary): TimelineItem {
  if (item.type === "chapterMarker") {
    return {
      kind: "chapter",
      id: item.id,
      sessionID: item.sessionID,
      subSessionID: item.subSessionID,
      title: item.name,
      date: item.date || item.startDate,
      tagIDs: item.tagIDs,
    };
  }

  return {
    kind: "marker",
    id: item.id,
    sessionID: item.sessionID,
    subSessionID: item.subSessionID,
    title: item.name,
    date: item.date,
    note: item.note,
    endDate: item.endDate,
    tagIDs: item.tagIDs,
  };
}

function filterTimelineByChapter(
  timeline: TimelineItem[],
  chapterID: string | undefined,
): TimelineItem[] {
  if (!chapterID) {
    return timeline;
  }

  const selectedChapter = timeline.find(
    (item) => item.kind === "chapter" && item.id === chapterID,
  );
  if (!selectedChapter) {
    return timeline;
  }

  const selectedTimestamp = timelineTimestamp(selectedChapter);
  const nextChapterTimestamp = timeline
    .filter((item) => item.kind === "chapter")
    .map(timelineTimestamp)
    .filter((timestamp) => timestamp > selectedTimestamp)
    .sort((lhs, rhs) => lhs - rhs)[0];

  return timeline.filter((item) => {
    if (item.kind === "chapter") {
      return item.id === selectedChapter.id;
    }

    const timestamp = timelineTimestamp(item);
    return (
      timestamp >= selectedTimestamp &&
      (nextChapterTimestamp === undefined || timestamp < nextChapterTimestamp)
    );
  });
}

function timelineTimestamp(item: TimelineItem): number {
  const timestamp = Date.parse(item.date);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function timelineSectionTitle(
  subsession: MarkerSubsessionSummary | undefined,
  chapterFilterID: string,
  chapters: TimelineItem[],
): string {
  const chapterID = realChapterValue(chapterFilterID);
  const chapter = chapterID
    ? chapters.find((item) => item.id === chapterID)
    : undefined;
  if (chapter) {
    return `${subsession?.name ?? "Timeline"} / ${chapter.title}`;
  }
  return subsession?.name ?? "Timeline";
}

function selectedSession(
  sessions: MarkerSessionSummary[],
  sessionID: string | undefined,
): MarkerSessionSummary | undefined {
  return sessions.find((session) => session.id === sessionID);
}

function displayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function displaySubsessionDate(
  subsession: MarkerSubsessionSummary,
): string | undefined {
  if (
    typeof subsession.lastStartTime === "number" &&
    subsession.lastStartTime > 0
  ) {
    return new Date(subsession.lastStartTime * 1000).toLocaleString();
  }
  if (subsession.updatedAt) {
    return displayDate(subsession.updatedAt);
  }
  if (subsession.createdAt) {
    return displayDate(subsession.createdAt);
  }
  return undefined;
}

function normalizedDateString(
  value: Date | null | undefined,
  label: string,
): string {
  if (!value || Number.isNaN(value.getTime())) {
    throw new Error(`${label} is required.`);
  }
  return value.toISOString();
}

function dateValue(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function detailMarkdown(item: TimelineItem): string {
  const parts = [
    item.title ? `# ${item.title}` : "# ",
    `**Type:** ${item.kind === "chapter" ? "Chapter Marker" : "Marker"}`,
    `**Date:** ${displayDate(item.date)}`,
  ];
  if (item.kind === "marker" && item.note) {
    parts.push(`\n${item.note}`);
  }
  if (item.tagIDs.length) {
    parts.push(`**Tags:** ${item.tagIDs.join(", ")}`);
  }
  return parts.join("\n\n");
}

function displayTimelineTitle(item: TimelineItem): string {
  return item.title || " ";
}

function offsetValidation(value: string | undefined) {
  try {
    offsetSeconds(value);
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid offset.";
  }
}

function realValue(value: string | undefined): string | undefined {
  if (!value || value === NO_SESSION_VALUE) {
    return undefined;
  }
  return value;
}

function realChapterValue(value: string | undefined): string | undefined {
  if (!value || value === ALL_CHAPTERS_VALUE) {
    return undefined;
  }
  return value;
}
