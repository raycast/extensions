import { Action, ActionPanel, Icon, Keyboard, List, getApplications } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { findHeed, tell } from "./heed";

/// One entry of `Heed --windows`. `id` is the window server's own number, which survives Heed
/// rebuilding its ring; `number` is only the place in that ring, so it is shown, never sent.
type HeedWindow = {
  id: number;
  number: number;
  app: string;
  bundleID: string | null;
  title: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  frontmost: boolean;
};

/// Trusted only as far as it has been read: another version of Heed answers a shape of its own.
function parseWindows(output: string): HeedWindow[] {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((entry): entry is HeedWindow => {
    const window = entry as Partial<HeedWindow>;
    return (
      typeof window?.id === "number" &&
      typeof window.number === "number" &&
      typeof window.app === "string" &&
      typeof window.width === "number" &&
      typeof window.height === "number"
    );
  });
}

export default function FocusWindow() {
  const [binary, setBinary] = useState<string>();
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string>();

  useEffect(() => {
    getApplications()
      .then((apps) => {
        const heed = findHeed(apps);
        if (!heed) {
          setMissing("brew install --cask rbstp/tap/heed");
          return;
        }
        setBinary(`${heed.path}/Contents/MacOS/Heed`);
        setIcons(
          Object.fromEntries(
            apps.filter((app) => app.bundleId).map((app) => [app.bundleId as string, app.path]),
          ),
        );
      })
      .catch((error: Error) => setMissing(error.message));
  }, []);

  const { isLoading, data, error, revalidate } = useExec(binary ?? "", ["--windows"], {
    execute: binary !== undefined,
    timeout: 5000,
  });

  const windows = useMemo<HeedWindow[]>(() => {
    if (!data) return [];
    try {
      return parseWindows(data);
    } catch {
      return [];
    }
  }, [data]);

  const failure = missing ?? error?.message;

  return (
    <List
      isLoading={binary === undefined ? missing === undefined : isLoading}
      searchBarPlaceholder="Search windows by name"
    >
      {failure ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={missing ? "Heed is not installed" : "Heed could not list the windows"}
          description={failure}
        />
      ) : (
        windows.map((window) => (
          <List.Item
            key={window.id}
            icon={
              window.bundleID && icons[window.bundleID]
                ? { fileIcon: icons[window.bundleID] }
                : Icon.AppWindow
            }
            title={window.title?.trim() || window.app}
            subtitle={
              window.title?.trim() && window.title.trim() !== window.app ? window.app : undefined
            }
            accessories={[
              ...(window.frontmost ? [{ tag: "front", tooltip: "Was in front" }] : []),
              {
                text: `${window.width} × ${window.height}`,
                tooltip: `at ${window.x}, ${window.y}`,
              },
              { tag: `${window.number}` },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Focus Window"
                  icon={Icon.Center}
                  onAction={() => tell(`focus/id/${window.id}`)}
                />
                <Action.CopyToClipboard title="Copy Title" content={window.title ?? window.app} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
