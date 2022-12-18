import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import React, { useCallback, useEffect, useState } from "react";
import { useLoadState, useSaveState } from "./hooks/load-state";
import { RaycastIcon, State } from "./types";
import { calcElapsedTime, capitalize, formatDuration, parseIntPreference } from "./utils";

export default function Command() {
  const [state, setState] = useState<State>({ type: "loading-state" });

  useSaveState(state);
  useLoadState({
    onStateLoaded: setState,
    defaultValue: {
      type: "begin",
    },
  });

  const handleStartWorking = useCallback(() => {
    setState({ type: "working", startedAt: new Date() });
  }, []);

  const handleShortRest = useCallback(() => {
    setState({ type: "resting", restType: "short", startedAt: new Date() });
  }, []);

  const handleLongRest = useCallback(() => {
    setState({ type: "resting", restType: "long", startedAt: new Date() });
  }, []);

  const handleStopWorking = useCallback(() => {
    setState({ type: "begin" });
  }, []);

  // preferences
  const preferences = getPreferenceValues();

  const workDuration = parseIntPreference(preferences["work-duration"], 25);
  const shortRestDuration = parseIntPreference(preferences["short-rest-duration"], 5);
  const longRestDuration = parseIntPreference(preferences["long-rest-duration"], 20);

  return (
    <>
      <List>
        {state.type === "begin" && (
          <>
            <List.Item
              title="Start working"
              subtitle={`${workDuration}m`}
              icon={{ source: Icon.Headphones, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Start working" onAction={handleStartWorking} />
                </ActionPanel>
              }
            />
          </>
        )}
        {state.type === "working" && (
          <>
            <ElapsedTime
              status="Working"
              since={state.startedAt}
              limitMinutes={workDuration}
              icon={{ source: Icon.Headphones, tintColor: Color.Blue }}
            />
            <List.Item
              title="Start resting"
              subtitle={`${shortRestDuration}m`}
              icon={{ source: Icon.Bolt, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action title="Start resting" onAction={handleShortRest} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Start resting"
              subtitle={`${longRestDuration}m`}
              icon={{ source: Icon.Bolt, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action title="Start resting" onAction={handleLongRest} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Stop working"
              icon={{ source: Icon.StopFilled, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Stop working" onAction={handleStopWorking} />
                </ActionPanel>
              }
            />
          </>
        )}
        {state.type === "resting" && (
          <>
            <ElapsedTime
              status="Resting"
              since={state.startedAt}
              limitMinutes={state.restType === "short" ? shortRestDuration : longRestDuration}
              icon={{ source: Icon.Bolt, tintColor: Color.Green }}
            />
            <List.Item
              title="Start working"
              subtitle={`${workDuration}m`}
              icon={{ source: Icon.Headphones, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action title="Start working" onAction={handleStartWorking} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Stop working"
              icon={{ source: Icon.StopFilled, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Stop working" onAction={handleStopWorking} />
                </ActionPanel>
              }
            />
          </>
        )}
      </List>
    </>
  );
}

const ElapsedTime = ({
  status,
  since,
  limitMinutes,
  icon,
  actions,
}: {
  status: string;
  since: Date;
  limitMinutes?: number;
  icon: RaycastIcon;
  actions?: React.ReactNode;
}) => {
  const [render, setRender] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRender((v) => !v);
    }, 300);

    return () => clearInterval(interval);
  }, [render]);

  const elapsedMinutes = (new Date().getTime() - since.getTime()) / 1000 / 60;
  const isDone = limitMinutes ? elapsedMinutes >= limitMinutes : false;

  return (
    <List.Item
      icon={icon}
      title={capitalize(status)}
      subtitle={formatDuration(calcElapsedTime(since)) + (isDone ? " (done)" : "")}
      actions={actions}
    />
  );
};
