import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import {
  EcosystemId,
  cleanupEcosystem,
  isEcosystemAvailable,
} from "./ecosystems";

const ECOSYSTEM_NAMES: Record<EcosystemId, string> = {
  brew: "Homebrew",
  npm: "npm",
  yarn: "yarn",
  pnpm: "pnpm",
  pip: "pip",
  pipx: "pipx",
  cargo: "cargo",
  gem: "RubyGems",
  mas: "Mac App Store",
  go: "Go",
  bun: "bun",
  deno: "deno",
  composer: "composer",
};

type EcosystemStatus = {
  id: EcosystemId;
  name: string;
  status: "idle" | "running" | "success" | "error" | "unsupported";
  message?: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const enabledEcosystems = useMemo(
    () =>
      (Object.keys(ECOSYSTEM_NAMES) as EcosystemId[]).filter(
        (id) =>
          prefs[
            `enable${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof Preferences
          ],
      ),
    [],
  );

  const [ecosystems, setEcosystems] = useState<EcosystemStatus[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);

  useEffect(() => {
    (async () => {
      const initial: EcosystemStatus[] = [];
      for (const id of enabledEcosystems) {
        const available = await isEcosystemAvailable(id);
        if (available) {
          const unsupported = ["cargo", "pipx", "deno", "mas"].includes(id);
          initial.push({
            id,
            name: ECOSYSTEM_NAMES[id],
            status: unsupported ? "unsupported" : "idle",
          });
        }
      }
      setEcosystems(initial);
    })();
  }, [enabledEcosystems]);

  async function runCleanup(id: EcosystemId) {
    setEcosystems((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "running" } : e)),
    );
    try {
      const result = await cleanupEcosystem(id);
      setEcosystems((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "success", message: result } : e,
        ),
      );
    } catch (err: any) {
      setEcosystems((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "error", message: err?.message } : e,
        ),
      );
    }
  }

  async function runAllCleanups() {
    setIsRunningAll(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cleaning up caches...",
    });
    const tasks = ecosystems
      .filter((e) => e.status !== "unsupported")
      .map((e) => runCleanup(e.id));
    await Promise.all(tasks);
    toast.style = Toast.Style.Success;
    toast.title = "Cleanup Complete";
    setIsRunningAll(false);
  }

  function getIcon(status: EcosystemStatus["status"]) {
    switch (status) {
      case "idle":
        return Icon.Circle;
      case "running":
        return Icon.RotateClockwise;
      case "success":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "error":
        return { source: Icon.Warning, tintColor: Color.Red };
      case "unsupported":
        return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    }
  }

  if (enabledEcosystems.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No ecosystems enabled"
          description="Please enable some ecosystems in preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isRunningAll}
      searchBarPlaceholder="Search ecosystems to clean up..."
    >
      <List.Section title="Cleanup Caches">
        {ecosystems.map((eco) => (
          <List.Item
            key={eco.id}
            title={eco.name}
            subtitle={
              eco.status === "unsupported"
                ? "No cleanup command available"
                : eco.status === "running"
                  ? "Cleaning..."
                  : eco.message ||
                    (eco.status === "idle" ? "Ready to clean" : "")
            }
            icon={getIcon(eco.status)}
            actions={
              <ActionPanel>
                {eco.status !== "unsupported" && (
                  <>
                    <Action
                      title="Run Cleanup"
                      icon={Icon.Trash}
                      onAction={() => void runCleanup(eco.id)}
                    />
                    <Action
                      title="Run All Cleanups"
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={() => void runAllCleanups()}
                    />
                  </>
                )}
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
