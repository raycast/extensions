import { Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { ActiveState, Demo } from "./types";
import { getActiveState, getDemos } from "./storage";
import { previewText } from "./utils";

const REFRESH_INTERVAL_MS = 2500;

export default function MenuBarCommand() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [activeState, setActiveState] = useState<ActiveState | null>(null);

  const load = async () => {
    const [loadedDemos, loadedState] = await Promise.all([getDemos(), getActiveState()]);
    setDemos(loadedDemos);
    setActiveState(loadedState);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const activeDemo = useMemo(() => {
    if (!activeState) {
      return null;
    }
    return demos.find((demo) => demo.id === activeState.demoId) ?? null;
  }, [activeState, demos]);

  const upcoming = useMemo(() => {
    if (!activeDemo || !activeState) {
      return [] as string[];
    }
    return activeDemo.snippets.slice(activeState.index, activeState.index + 5).map((snippet) => snippet.text);
  }, [activeDemo, activeState]);

  const label = activeDemo && upcoming.length > 0 ? `Next: ${previewText(upcoming[0], 28)}` : "Demo Snippet";

  return (
    <MenuBarExtra icon={Icon.Clipboard} title={label}>
      {activeDemo ? (
        <MenuBarExtra.Section title={`Active Demo: ${activeDemo.name}`}>
          {upcoming.length > 0 ? (
            upcoming.map((snippet, index) => (
              <MenuBarExtra.Item
                key={`${activeDemo.id}-${index}`}
                title={`${index + 1}. ${previewText(snippet, 60)}`}
              />
            ))
          ) : (
            <MenuBarExtra.Item title="No upcoming snippets" />
          )}
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item title="No active demo" />
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Manage Demo Snippets"
          icon={Icon.List}
          onAction={async () => {
            await launchCommand({ name: "manage-demo-snippets", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
