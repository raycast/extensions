import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getState, setState } from "./lib/storage";
import { promoteStream, releaseQueue, EMPTY_STATE } from "./lib/state";
import type { State } from "./lib/types";

export default function Command() {
  const [state, setLocalState] = useState<State>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const s = await getState();
    setLocalState(s);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback(async (newState: State) => {
    await setState(newState);
    setLocalState(newState);
  }, []);

  const { streams } = state;
  const topStream = streams[0];

  const menuTitle = topStream
    ? topStream.title.length > 20
      ? topStream.title.slice(0, 20) + "..."
      : topStream.title
    : "brainuv";

  const menuIcon = topStream
    ? { source: Icon.CircleFilled, tintColor: topStream.color }
    : Icon.Circle;

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={menuTitle}
      isLoading={isLoading}
      tooltip="brainuv — Stream Loop"
    >
      {streams.length === 0 ? (
        <MenuBarExtra.Item title="No active streams" icon={Icon.Circle} />
      ) : (
        <MenuBarExtra.Section title="Streams">
          {streams.map((stream, index) => (
            <MenuBarExtra.Item
              key={stream.id}
              icon={
                index === 0
                  ? { source: Icon.CheckCircle, tintColor: stream.color }
                  : { source: Icon.CircleFilled, tintColor: stream.color }
              }
              title={`${index + 1}. ${stream.title}`}
              onAction={async () => {
                if (index === 0) return;
                const s = await getState();
                const next = promoteStream(s, stream.id);
                await persist(next);
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {streams.length > 1 && (
          <MenuBarExtra.Item
            title="Release Queue"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              const s = await getState();
              const next = releaseQueue(s);
              await persist(next);
            }}
          />
        )}
        <MenuBarExtra.Item
          title="Add Stream..."
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={async () => {
            await launchCommand({
              name: "add-stream",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Open Stream Loop"
          icon={Icon.List}
          onAction={async () => {
            await launchCommand({
              name: "stream-loop",
              type: LaunchType.UserInitiated,
            });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
