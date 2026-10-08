import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { FrameList } from "./explore";
import { captureSubtitle, groupMoments } from "./moments";
import { readableTime } from "./dates";
import { useCallback, useEffect, useRef, useState } from "react";
import { CaptureActions, CaptureDetailPane } from "./capture";
import { type CaptureDetail, type TimelineArgs } from "./coast";
import { loadTimeline, type TimelinePreset } from "./timeline-data";

type State = {
  frames: CaptureDetail[];
  scope?: TimelineArgs;
  isLoading: boolean;
  error?: string;
};

export default function Command() {
  const request = useRef(0);
  const [preset, setPreset] = useState<TimelinePreset>("cover-30m");
  const [state, setState] = useState<State>({
    frames: [],
    isLoading: true,
  });

  const load = useCallback(async () => {
    const id = ++request.current;
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: undefined,
    }));
    try {
      const result = await loadTimeline(preset);
      if (id === request.current) setState({ ...result, isLoading: false });
    } catch (error) {
      if (id !== request.current) return;
      const message = error instanceof Error ? error.message : String(error);
      setState({ frames: [], isLoading: false, error: message });
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load timeline",
        message,
      });
    }
  }, [preset]);

  useEffect(() => {
    load();
    return () => {
      request.current++;
    };
  }, [load]);

  const dropdown = (
    <List.Dropdown
      tooltip="Timeline Range"
      storeValue
      value={preset}
      onChange={(value) => setPreset(value as TimelinePreset)}
    >
      <List.Dropdown.Item
        title="Last 30 Minutes - Detailed"
        value="cover-30m"
      />
      <List.Dropdown.Item title="Last Hour - Highlights" value="sample-1h" />
      <List.Dropdown.Item title="Today - Highlights" value="sample-today" />
      <List.Dropdown.Item
        title="Yesterday - Highlights"
        value="sample-yesterday"
      />
    </List.Dropdown>
  );

  return (
    <List
      isLoading={state.isLoading}
      isShowingDetail
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Filter timeline..."
      throttle
    >
      {state.error ? (
        <List.EmptyView
          title="Failed to load timeline"
          description={state.error}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {!state.error && state.frames.length === 0 && !state.isLoading ? (
        <List.EmptyView
          title="No activity"
          description="Coast did not record activity in this range."
          icon={Icon.Clock}
        />
      ) : null}
      {groupMoments(state.frames).map((frames) => {
        const capture = frames[0];
        return (
          <List.Item
            key={capture.frame_id}
            title={capture.title || capture.application}
            subtitle={captureSubtitle(capture)}
            accessories={[
              ...(frames.length > 1
                ? [{ text: `${frames.length} moments` }]
                : []),
              { text: readableTime(capture.timestamp) },
            ]}
            detail={
              <CaptureDetailPane key={capture.frame_id} capture={capture} />
            }
            actions={
              frames.length > 1 ? (
                <ActionPanel>
                  <Action.Push
                    title="Explore Moments"
                    target={
                      <FrameList
                        frames={frames}
                        navigationFrames={state.frames}
                        scope={state.scope}
                      />
                    }
                  />
                </ActionPanel>
              ) : (
                <CaptureActions
                  capture={capture}
                  frames={state.frames}
                  scope={state.scope}
                />
              )
            }
          />
        );
      })}
    </List>
  );
}
