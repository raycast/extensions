import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import {
  Adoptable,
  dismissAdoption,
  resolveBinaries,
  runKnownInstall,
} from "../utils/adoption";
import { installCask } from "../utils/sources/homebrew";
import { getKnownInstall } from "../utils/known-installs";
import { openInAppStore, openInTerminal } from "../utils/external";

type Status =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "dismissed"
  | "deselected"
  | "cancelled";

interface Row {
  app: Adoptable["app"];
  caskToken: string;
  kind: Adoptable["kind"];
  description?: string;
  status: Status;
  error?: string;
}

interface Props {
  adoptable: Adoptable[];
  onDone: () => void;
}

export default function AdoptApps({ adoptable, onDone }: Props) {
  const { pop } = useNavigation();
  const [rows, setRows] = useState<Row[]>(
    adoptable.map((a) => ({
      app: a.app,
      caskToken: a.caskToken,
      kind: a.kind,
      description: a.description,
      status: "pending",
    })),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);

  function requestCancel() {
    cancelRef.current = true;
  }

  function patch(appPath: string, update: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.app.appPath === appPath ? { ...r, ...update } : r)),
    );
  }

  function toggleSelected(appPath: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.app.appPath === appPath
          ? {
              ...r,
              status:
                r.status === "deselected"
                  ? "pending"
                  : r.status === "pending"
                    ? "deselected"
                    : r.status,
            }
          : r,
      ),
    );
  }

  async function dismiss(row: Row) {
    await dismissAdoption(row.app.bundleId);
    patch(row.app.appPath, { status: "dismissed" });
  }

  async function runAdoption() {
    const queue = rows.filter((r) => r.status === "pending");
    if (queue.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No apps selected",
      });
      return;
    }

    // Short, human-readable confirmation. Showing 26 raw brew commands in an
    // alert blows past its visible area — just preview a few names and a count.
    const namePreview = queue
      .slice(0, 4)
      .map((r) => r.app.name)
      .join(", ");
    const more = queue.length > 4 ? `, and ${queue.length - 4} more` : "";
    const timeHint =
      queue.length > 5
        ? "\n\nThis can take several minutes. You can cancel any time."
        : "";
    const confirmed = await confirmAlert({
      title: `Adopt ${queue.length} app${queue.length === 1 ? "" : "s"}?`,
      message: `${namePreview}${more}.\n\nEach app gets replaced with its managed copy. Updates flow through brew or the App Store from then on.${timeHint}`,
      primaryAction: {
        title: queue.length > 1 ? "Adopt All" : "Adopt",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;

    cancelRef.current = false;
    setRunning(true);
    setDone(false);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adopting 1 of ${queue.length}…`,
    });

    // Serial — each install can take a while and may want admin auth.
    // Per-step timeout protects against a single stuck install hanging the queue.
    const PER_STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 min per app
    for (let i = 0; i < queue.length; i++) {
      const r = queue[i];
      if (cancelRef.current) {
        patch(r.app.appPath, { status: "cancelled" });
        // Mark every remaining queued row as cancelled too
        for (let j = i + 1; j < queue.length; j++) {
          patch(queue[j].app.appPath, { status: "cancelled" });
        }
        break;
      }

      toast.title = `Adopting ${r.app.name} (${i + 1} of ${queue.length})…`;
      patch(r.app.appPath, { status: "running" });

      const installPromise = (async () => {
        if (r.kind === "cask") return installCask(r.caskToken);
        const known = getKnownInstall(r.app.bundleId);
        if (!known)
          return { success: false, error: "Known install entry missing" };
        const u = await runKnownInstall(known, r.app.name);
        return { success: u.success, error: u.error };
      })();

      const timeoutPromise = new Promise<{ success: false; error: string }>(
        (resolve) =>
          setTimeout(
            () =>
              resolve({ success: false, error: `Timed out after 5 minutes` }),
            PER_STEP_TIMEOUT_MS,
          ),
      );

      const result = await Promise.race([installPromise, timeoutPromise]);
      patch(r.app.appPath, {
        status: result.success ? "success" : "failed",
        error: "error" in result ? result.error : undefined,
      });
    }

    setRunning(false);
    setDone(true);
    cancelRef.current = false;

    setRows((prev) => {
      const succ = prev.filter((r) => r.status === "success").length;
      const fail = prev.filter((r) => r.status === "failed").length;
      const cancelled = prev.filter((r) => r.status === "cancelled").length;
      toast.style =
        fail + cancelled === 0 ? Toast.Style.Success : Toast.Style.Failure;
      const parts: string[] = [];
      if (succ > 0) parts.push(`${succ} adopted`);
      if (fail > 0) parts.push(`${fail} failed`);
      if (cancelled > 0) parts.push(`${cancelled} cancelled`);
      toast.title = parts.join(" · ") || "Nothing to do";
      return prev;
    });
  }

  function statusAccessory(status: Status): List.Item.Accessory {
    switch (status) {
      case "running":
        return { tag: { value: "Installing…", color: Color.Blue } };
      case "success":
        return { tag: { value: "Adopted", color: Color.Green } };
      case "failed":
        return { tag: { value: "Failed", color: Color.Red } };
      case "cancelled":
        return { tag: { value: "Cancelled", color: Color.SecondaryText } };
      case "dismissed":
        return { tag: { value: "Dismissed", color: Color.SecondaryText } };
      case "deselected":
        return { tag: { value: "Skipped", color: Color.SecondaryText } };
      default:
        return { tag: { value: "Will adopt", color: Color.Orange } };
    }
  }

  function statusIcon(status: Status): { source: Icon; tintColor: Color } {
    switch (status) {
      case "running":
        return { source: Icon.ArrowClockwise, tintColor: Color.Blue };
      case "success":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "failed":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "cancelled":
        return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
      case "dismissed":
        return { source: Icon.EyeDisabled, tintColor: Color.SecondaryText };
      case "deselected":
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.Mug, tintColor: Color.Orange };
    }
  }

  const pending = rows.filter((r) => r.status === "pending").length;
  const skipped = rows.filter(
    (r) => r.status === "deselected" || r.status === "dismissed",
  ).length;

  return (
    <List
      isLoading={running}
      navigationTitle={
        running
          ? "Adopting…"
          : done
            ? "Adoption complete"
            : `Adopt ${pending} app${pending === 1 ? "" : "s"} to Homebrew`
      }
      searchBarPlaceholder="Filter…"
    >
      {!running && !done && rows.length > 0 && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.Rocket, tintColor: Color.Blue }}
            title={
              pending === 0
                ? "Nothing selected"
                : `Adopt ${pending} app${pending === 1 ? "" : "s"}`
            }
            subtitle={
              skipped > 0 ? `${skipped} skipped` : "Each runs one at a time"
            }
            accessories={[
              {
                tag: { value: "Start", color: Color.Blue },
                icon: Icon.ArrowRight,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Adopt Selected"
                  icon={Icon.Mug}
                  onAction={runAdoption}
                />
                <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {running && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Cancel"
            subtitle="Stops after the current install finishes"
            actions={
              <ActionPanel>
                <Action
                  title="Cancel Adoption"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={requestCancel}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Apps" subtitle={`${rows.length}`}>
        {rows.map((r) => (
          <List.Item
            key={r.app.appPath}
            icon={{ fileIcon: r.app.appPath }}
            title={r.app.name}
            subtitle={
              r.error
                ? `⚠ ${r.error.split("\n")[0].slice(0, 120)}`
                : describeTarget(r)
            }
            accessories={[
              { icon: statusIcon(r.status), tooltip: r.error ?? r.status },
              statusAccessory(r.status),
            ]}
            actions={
              !running ? (
                <ActionPanel>
                  {r.status === "pending" && (
                    <Action
                      title="Skip This One"
                      icon={Icon.Minus}
                      onAction={() => toggleSelected(r.app.appPath)}
                    />
                  )}
                  {r.status === "deselected" && (
                    <Action
                      title="Include This One"
                      icon={Icon.Plus}
                      onAction={() => toggleSelected(r.app.appPath)}
                    />
                  )}
                  <Action
                    title="Adopt Selected"
                    icon={Icon.Mug}
                    onAction={runAdoption}
                  />

                  {/* Failure escape hatches — surface only when the row failed */}
                  {r.status === "failed" && (
                    <>
                      {getKnownInstall(r.app.bundleId)?.kind === "mas" &&
                        getKnownInstall(r.app.bundleId)?.masId && (
                          <Action
                            title="Open in App Store"
                            icon={Icon.Store}
                            onAction={() =>
                              openInAppStore(
                                getKnownInstall(r.app.bundleId)!.masId!,
                              )
                            }
                          />
                        )}
                      <Action
                        title="Run Install Command in Terminal"
                        icon={Icon.Terminal}
                        onAction={() => {
                          const known = getKnownInstall(r.app.bundleId);
                          const cmd = known
                            ? known.commands.join(" && ")
                            : `/opt/homebrew/bin/brew install --cask --force "${r.caskToken}"`;
                          // Rewrite the brew path for Intel vs Apple Silicon.
                          openInTerminal(resolveBinaries(cmd));
                        }}
                      />
                      {getKnownInstall(r.app.bundleId)?.homepageUrl && (
                        <Action.OpenInBrowser
                          title="Open Project Download Page"
                          url={getKnownInstall(r.app.bundleId)!.homepageUrl!}
                          icon={Icon.Globe}
                        />
                      )}
                    </>
                  )}

                  {r.error && (
                    <Action.CopyToClipboard
                      title="Copy Full Error"
                      content={r.error}
                      icon={Icon.Clipboard}
                    />
                  )}
                  <Action
                    title="Never Suggest This App"
                    icon={Icon.EyeDisabled}
                    style={Action.Style.Destructive}
                    onAction={() => dismiss(r)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                  <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
                </ActionPanel>
              ) : undefined
            }
          />
        ))}
      </List.Section>

      {done && (
        <List.Section>
          <List.Item
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            title="Done — back to Mac Updater"
            actions={
              <ActionPanel>
                <Action
                  title="Back"
                  icon={Icon.ArrowLeft}
                  onAction={() => {
                    onDone();
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function describeTarget(r: {
  kind: Adoptable["kind"];
  caskToken: string;
  description?: string;
}): string {
  if (r.kind === "mas")
    return `Mac App Store · ${r.description ?? "mas install"}`;
  if (r.kind === "brew-tap") return `Homebrew tap · ${r.caskToken}`;
  return `brew install --cask ${r.caskToken}`;
}
