import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";
import { CaptureActions } from "./capture";
import {
  getAccessibilityTree,
  getCapture,
  getCaptureImage,
  getOcrBoxes,
  sampleActivity,
  timelineCover,
  usageSessions,
  type CaptureDetail,
  type TimelineArgs,
} from "./coast";
import {
  duration,
  formatLocalDateTime,
  readableTime,
  scopeMetadata,
} from "./dates";
import { captureSubtitle, groupMoments } from "./moments";
import { useLoad } from "./use-load";
import { pathToFileURL } from "node:url";
import {
  nearbyFrames,
  orderedFrames,
  relatedMoments,
  type RelatedKind,
} from "./discovery";
import { accessibilityEvidence, captureEvidence } from "./evidence";
import { offsetDate, today } from "./dates";
import { InspectorOpenActions } from "./inspector-open-actions";

export function Inspector({
  capture: initial,
  frames,
  scope,
}: {
  capture: CaptureDetail;
  frames?: CaptureDetail[];
  scope?: Partial<TimelineArgs>;
}) {
  const [capture, setCapture] = useState(initial);
  const loadNeighbors = useCallback(
    async () =>
      frames?.length
        ? orderedFrames(frames)
        : (await nearbyFrames(initial, scope)).frames,
    [initial, frames, scope],
  );
  const neighbors = useLoad(loadNeighbors);
  const index =
    neighbors.data?.findIndex((frame) => frame.frame_id === capture.frame_id) ??
    -1;
  const previous = index > 0 ? neighbors.data?.[index - 1] : undefined;
  const next = index >= 0 ? neighbors.data?.[index + 1] : undefined;
  const [mode, setMode] = useState("Screenshot");
  const load = useCallback(async () => {
    if (mode === "Screenshot")
      return `![Capture](${pathToFileURL(await getCaptureImage(capture.frame_id)).href})`;
    if (mode === "OCR")
      return (
        (await getCapture(capture.frame_id)).ocr_text || "No OCR recorded."
      );
    if (mode === "UI Tree") {
      const tree = await getAccessibilityTree({
        frameId: capture.frame_id,
        human: true,
        textOnly: true,
      });
      const evidence = accessibilityEvidence(tree);
      return `${evidence.warnings.join("\n")}\n\n${evidence.tree_text || "No accessibility text available."}`;
    }
    return JSON.stringify(
      mode === "OCR Boxes"
        ? await getOcrBoxes(capture.frame_id)
        : captureEvidence(capture),
      null,
      2,
    );
  }, [capture, mode]);
  const state = useLoad(load);
  const markdown =
    mode === "Screenshot"
      ? state.data
      : `~~~text\n${(state.data || "").replaceAll("~~~", "~ ~ ~")}\n~~~`;
  return (
    <Detail
      navigationTitle={`${mode} · ${readableTime(capture.timestamp)}`}
      isLoading={state.isLoading}
      markdown={state.error || markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Captured"
            text={readableTime(capture.timestamp, true)}
          />
          <Detail.Metadata.Label
            title="Application"
            text={capture.application}
          />
          <Detail.Metadata.Label
            title="Sequence"
            text={
              neighbors.error ||
              (neighbors.isLoading
                ? "Loading nearby moments…"
                : `${index + 1} of ${neighbors.data?.length || 0} selected moments`)
            }
          />
          {scope?.tr ? (
            scopeMetadata(scope.tr).map((row) => (
              <Detail.Metadata.Label
                key={row.title}
                title={row.title}
                text={row.text}
              />
            ))
          ) : (
            <Detail.Metadata.Label
              title="Scope"
              text={
                frames
                  ? "Current result set"
                  : "Within 15 minutes of the starting capture"
              }
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open Moment">
            <InspectorOpenActions capture={capture} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigate Selected Moments">
            {next && (
              <Action
                title="Next Moment"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => setCapture(next)}
              />
            )}
            {previous && (
              <Action
                title="Previous Moment"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={() => setCapture(previous)}
              />
            )}
            <ActionPanel.Submenu
              title="Find Related Moments…"
              icon={Icon.MagnifyingGlass}
            >
              {(["url", "title", "application"] as const).map((kind) => (
                <Action.Push
                  key={kind}
                  title={`Match ${kind === "url" ? "URL" : kind === "title" ? "Title" : "Application"}`}
                  target={<RelatedMoments capture={capture} kind={kind} />}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section title="Inspect">
            {["Screenshot", "OCR", "UI Tree", "OCR Boxes", "Metadata"].map(
              (value) => (
                <Action
                  key={value}
                  title={`Show ${value}`}
                  onAction={() => setMode(value)}
                />
              ),
            )}
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={state.retry}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function FrameList({
  frames,
  navigationFrames = frames,
  scope,
}: {
  frames: CaptureDetail[];
  navigationFrames?: CaptureDetail[];
  scope?: TimelineArgs;
}) {
  return (
    <List navigationTitle="Moments" searchBarPlaceholder="Filter moments…">
      <List.Section title={`${frames.length} selected captures`}>
        {frames.map((capture) => (
          <List.Item
            key={capture.frame_id}
            title={capture.title || capture.application}
            subtitle={captureSubtitle(capture)}
            accessories={[{ text: readableTime(capture.timestamp) }]}
            actions={
              <CaptureActions
                capture={capture}
                frames={navigationFrames}
                scope={scope}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export function MomentsView({
  scope,
  title = "Activity Highlights",
}: {
  scope: TimelineArgs;
  title?: string;
}) {
  const load = useCallback(async () => {
    const [start, end] = scope.tr.split("|");
    const short =
      end && new Date(end).getTime() - new Date(start).getTime() <= 30 * 60_000;
    return short
      ? (await timelineCover(scope)).frames
      : (await sampleActivity(scope)).map((segment) => segment.selected_frame);
  }, [scope]);
  const state = useLoad(load);
  const groups = groupMoments(state.data || []);
  return (
    <List
      navigationTitle={title}
      isLoading={state.isLoading}
      searchBarPlaceholder="Filter moments…"
    >
      <List.EmptyView
        title={state.error ? "Could Not Load Moments" : "No Recorded Moments"}
        description={state.error || "Try a different time range."}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={state.retry} />
          </ActionPanel>
        }
      />
      <List.Section
        title={`${groups.length} activity groups`}
        subtitle="Representative captures"
      >
        {groups.map((frames) => {
          const first = frames[0];
          return (
            <List.Item
              key={first.frame_id}
              title={first.title || first.application}
              subtitle={captureSubtitle(first)}
              accessories={[
                {
                  text: `${frames.length} ${frames.length === 1 ? "moment" : "moments"}`,
                },
                { text: readableTime(first.timestamp) },
              ]}
              actions={
                frames.length > 1 ? (
                  <ActionPanel>
                    <Action.Push
                      title="Explore Moments"
                      target={<FrameList frames={frames} scope={scope} />}
                    />
                  </ActionPanel>
                ) : (
                  <CaptureActions
                    capture={first}
                    frames={state.data}
                    scope={scope}
                  />
                )
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export function RelatedMoments({
  capture,
  kind,
}: {
  capture: CaptureDetail;
  kind: RelatedKind;
}) {
  const [range, setRange] = useState("7");
  const [offset, setOffset] = useState(0);
  const tr = `${offsetDate(Number(range) - 1)}|${today()}`;
  const load = useCallback(
    () => relatedMoments(capture.frame_id, tr, kind, { offset, limit: 50 }),
    [capture.frame_id, tr, kind, offset],
  );
  const state = useLoad(load);
  const matches = state.data?.matches || [];
  const nextOffset = state.data?.pagination.next_offset;
  const pageActions = (
    <>
      {nextOffset != null ? (
        <Action
          title="Next Candidate Page"
          icon={Icon.ArrowRight}
          onAction={() => setOffset(nextOffset)}
        />
      ) : null}
      {offset > 0 ? (
        <Action
          title="Previous Candidate Page"
          icon={Icon.ArrowLeft}
          onAction={() => setOffset(Math.max(0, offset - 50))}
        />
      ) : null}
    </>
  );
  return (
    <List
      navigationTitle={`Related by ${kind}`}
      isLoading={state.isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Related Range"
          value={range}
          onChange={(value) => {
            setRange(value);
            setOffset(0);
          }}
        >
          <List.Dropdown.Item title="Last 7 Days" value="7" />
          <List.Dropdown.Item title="Last 30 Days" value="30" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={
          state.error
            ? "Could Not Find Related Moments"
            : "No Matches on This Candidate Page"
        }
        description={state.error || state.data?.warning}
        actions={
          <ActionPanel>
            {pageActions}
            <Action title="Retry" onAction={state.retry} />
          </ActionPanel>
        }
      />
      <List.Section
        title={`${matches.length} verified matches`}
        subtitle={`Candidate page ${Math.floor(offset / 50) + 1}${nextOffset != null ? " · More available" : " · End of candidates"}`}
      >
        {matches.map(({ capture: item, reason }) => (
          <List.Item
            key={item.frame_id}
            title={item.title || item.application}
            subtitle={reason}
            accessories={[{ text: readableTime(item.timestamp) }]}
            actions={
              <CaptureActions
                capture={item}
                frames={matches.map((match) => match.capture)}
              >
                {pageActions}
              </CaptureActions>
            }
          />
        ))}
      </List.Section>
      {nextOffset != null ? (
        <List.Item
          title="Load Next Candidate Page"
          subtitle="More candidates may contain exact matches"
          icon={Icon.ArrowRight}
          actions={<ActionPanel>{pageActions}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}

export function SessionsView({
  scope,
  title,
}: {
  scope: TimelineArgs;
  title: string;
}) {
  const load = useCallback(
    () => usageSessions(scope.tr, scope.appFilters, scope.domainFilters),
    [scope],
  );
  const state = useLoad(load);
  return (
    <List navigationTitle={title} isLoading={state.isLoading}>
      <List.EmptyView
        title={state.error ? "Could Not Load Sessions" : "No Recorded Sessions"}
        description={state.error}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={state.retry} />
          </ActionPanel>
        }
      />
      <List.Section
        title={`${state.data?.session_count || 0} sessions`}
        subtitle={
          state.data ? duration(state.data.total_duration_seconds) : undefined
        }
      >
        {(state.data?.sessions || []).map((session) => (
          <List.Item
            key={session.start_ms}
            title={readableTime(session.start)}
            subtitle={`Until ${new Date(session.end_ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
            accessories={[{ text: duration(session.duration_seconds) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Explore Session"
                  target={
                    <MomentsView
                      title={title}
                      scope={{
                        ...scope,
                        tr: `${formatLocalDateTime(new Date(session.start_ms))}|${formatLocalDateTime(new Date(session.end_ms))}`,
                      }}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
