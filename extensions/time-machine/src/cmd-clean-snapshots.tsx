import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  Color,
  useNavigation,
  Form,
  Detail,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Snapshot {
  id: string;
  date: string;
  displayName: string;
  size?: string;
  isTimeMachine: boolean;
}

interface DeletionResult {
  snapshot: string;
  success: boolean;
  error?: string;
}

// Helper to run tasks in parallel with concurrency limit
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: Promise<R>[] = [];
  const executing: Promise<void>[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    // Create the promise for this task
    const promise = Promise.resolve().then(() => fn(item, index));
    results.push(promise);

    // If we've reached the limit, wait for one to finish
    if (limit <= items.length) {
      // Settle (not just fulfill) before cleanup, so a rejected task is still
      // removed from the executing set and cannot poison the next Promise.race
      const executePromise = promise
        .catch(() => undefined)
        .then(() => {
          executing.splice(executing.indexOf(executePromise), 1);
        });
      executing.push(executePromise);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}

// Run sudo with the given arguments, sending the password via stdin so it
// never appears in the process argument list (visible in `ps` output).
function runSudo(password: string, args: string[], timeoutMs = 0): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/sudo", ["-S", "-p", "", ...args], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill();
          }, timeoutMs)
        : undefined;

    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(Object.assign(new Error("Command timed out"), { stdout, stderr }));
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(Object.assign(new Error(stderr || stdout || `sudo exited with code ${code}`), { stdout, stderr }));
      }
    });

    child.stdin.write(password + "\n");
    child.stdin.end();
  });
}

// Helper to verify administrator password
async function verifyPassword(password: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // -k as a flag (combined with -v) makes sudo ignore cached credentials for
    // this invocation, so the password is actually checked, without
    // invalidating any sudo session the user may have open elsewhere.
    await runSudo(password, ["-k", "-v"], 10000);
    return { valid: true };
  } catch (error: unknown) {
    if (error instanceof Error) {
      const execError = error as Error & { stderr?: string; stdout?: string };
      const output = execError.stderr || execError.stdout || error.message;

      if (output.includes("Sorry") || output.includes("incorrect password")) {
        return { valid: false, error: "Incorrect password" };
      }
    }
    return { valid: false, error: "Failed to verify password" };
  }
}

// Component to request administrator password
function PasswordForm({ onSubmit }: { onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsVerifying(true);
    setError(null);

    const result = await verifyPassword(password);

    if (result.valid) {
      onSubmit(password);
      pop();
    } else {
      setError(result.error || "Incorrect password. Please try again.");
      setIsVerifying(false);
    }
  }

  return (
    <Form
      isLoading={isVerifying}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Confirm" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="password"
        title="Administrator Password"
        placeholder="Enter your password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          if (error) setError(null);
        }}
        error={error || undefined}
      />
      <Form.Description text="Your password is required to delete Time Machine snapshots and will not be stored." />
    </Form>
  );
}

// Component to show deletion progress (prevents exiting)
function DeletionProgress({
  progress,
  total,
  currentSnapshot,
}: {
  progress: number;
  total: number;
  currentSnapshot?: string;
}) {
  const percentage = Math.round((progress / total) * 100);
  const progressBar = "█".repeat(Math.floor(percentage / 5)) + "░".repeat(20 - Math.floor(percentage / 5));

  return (
    <Detail
      markdown={`# 🗑️ Deleting Snapshots

## Progress: ${progress}/${total} (${percentage}%)

\`\`\`
${progressBar}
\`\`\`

${currentSnapshot ? `**Current:** ${currentSnapshot}` : ""}

⚠️ **Please wait - Do not close this window**

Deletion in progress. This may take several minutes depending on snapshot size.
      `}
      navigationTitle="Deleting Snapshots"
    />
  );
}

export default function Command() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0, snapshot: "" });
  const { push } = useNavigation();

  // Load snapshots on mount
  useEffect(() => {
    loadSnapshots();
  }, []);

  async function loadSnapshots() {
    setIsLoading(true);
    try {
      const result = await execAsync("tmutil listlocalsnapshots /");

      const lines = result.stdout.trim().split("\n");

      const snapshotList: Snapshot[] = lines
        .filter((line) => {
          // Include both TimeMachine snapshots and others (Arq, etc)
          return (
            line.includes("com.apple.TimeMachine") ||
            line.startsWith("com_") ||
            line.includes("local") ||
            (line.trim().length > 0 && !line.includes("Snapshots for"))
          );
        })
        .map((line) => {
          const trimmedLine = line.trim();

          // Case 1: Standard Time Machine snapshot
          // Format: com.apple.TimeMachine.2024-01-13-120000.local
          const tmMatch = trimmedLine.match(/com\.apple\.TimeMachine\.(\d{4}-\d{2}-\d{2}-\d{6})/);
          if (tmMatch) {
            const dateStr = tmMatch[1];
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(5, 7);
            const day = dateStr.substring(8, 10);
            const hour = dateStr.substring(11, 13);
            const minute = dateStr.substring(13, 15);
            const second = dateStr.substring(15, 17);

            return {
              id: dateStr,
              date: dateStr,
              displayName: `Time Machine - ${year}-${month}-${day} ${hour}:${minute}:${second}`,
              isTimeMachine: true,
            };
          }

          // Case 2: Arq or other backup software snapshot
          // Format: com_haystacksoftware_arqagent_UUID_N
          if (trimmedLine.startsWith("com_") || trimmedLine.includes("_")) {
            // Keep the exact name as listed: deletion via diskutil matches by full snapshot name
            const snapshotId = trimmedLine;

            // Try to extract readable information
            let displayName = snapshotId;

            // Arq agent
            if (snapshotId.includes("arqagent")) {
              const parts = snapshotId.split("_");
              const version = parts[parts.length - 1] || "?";
              displayName = `Arq Backup #${version}`;
            }
            // Other backup software
            else if (snapshotId.includes("backblaze")) {
              displayName = `Backblaze Backup`;
            } else if (snapshotId.includes("carbon")) {
              displayName = `Carbon Copy Cloner`;
            } else {
              // Generic name for unknown snapshots
              displayName = `Other Snapshot - ${snapshotId.substring(0, 40)}...`;
            }

            return {
              id: snapshotId,
              date: snapshotId,
              displayName,
              isTimeMachine: false,
            };
          }

          return null;
        })
        .filter((s): s is Snapshot => s !== null);

      setSnapshots(snapshotList);

      if (snapshotList.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No snapshots found",
          message: "There are no local Time Machine snapshots to clean",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load snapshots",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSnapshot(snapshotId: string) {
    setSelectedSnapshots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(snapshotId)) {
        newSet.delete(snapshotId);
      } else {
        newSet.add(snapshotId);
      }
      return newSet;
    });
  }

  function selectAll() {
    setSelectedSnapshots(new Set(snapshots.map((s) => s.id)));
    showToast({
      style: Toast.Style.Success,
      title: "All snapshots selected",
    });
  }

  function deselectAll() {
    setSelectedSnapshots(new Set());
    showToast({
      style: Toast.Style.Success,
      title: "All snapshots deselected",
    });
  }

  async function deleteSnapshots(password: string) {
    if (selectedSnapshots.size === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No snapshots selected",
        message: "Please select at least one snapshot to delete",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Selected Snapshots?",
      message: `You are about to delete ${selectedSnapshots.size} snapshot(s). This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsDeleting(true);
    setDeletionProgress({ current: 0, total: selectedSnapshots.size, snapshot: "" });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting snapshots...",
      message: `0/${selectedSnapshots.size} completed`,
    });

    const results: DeletionResult[] = [];
    const snapshotsToDelete = Array.from(selectedSnapshots);
    const timeMachineIds = new Set(snapshots.filter((s) => s.isTimeMachine).map((s) => s.id));

    // Read user preference for concurrency
    const preferences = getPreferenceValues<Preferences.CmdCleanSnapshots>();
    const concurrencyLimit = parseInt(preferences.concurrency || "3", 10);

    // Thread-safe counter for progress tracking
    let completedCount = 0;
    let authFailed = false;

    // Delete in parallel with concurrency limit
    await runWithConcurrencyLimit(snapshotsToDelete, concurrencyLimit, async (snapshotDate) => {
      // If authentication already failed, skip
      if (authFailed) {
        results.push({
          snapshot: snapshotDate,
          success: false,
          error: "Skipped due to previous authentication failure",
        });
        return;
      }

      try {
        setDeletionProgress({ current: completedCount, total: snapshotsToDelete.length, snapshot: snapshotDate });

        // The snapshot id is passed as a separate argument (no shell involved),
        // and the password goes to sudo via stdin, so neither needs escaping.
        // tmutil deletelocalsnapshots only accepts a YYYY-MM-DD-HHMMSS date, so
        // third-party snapshots (Arq, Backblaze, ...) are deleted by name via
        // diskutil; local snapshots live on the APFS Data volume.
        if (timeMachineIds.has(snapshotDate)) {
          await runSudo(password, ["/usr/bin/tmutil", "deletelocalsnapshots", snapshotDate]);
        } else {
          await runSudo(password, [
            "/usr/sbin/diskutil",
            "apfs",
            "deleteSnapshot",
            "/System/Volumes/Data",
            "-name",
            snapshotDate,
          ]);
        }

        results.push({ snapshot: snapshotDate, success: true });

        // Increment counter and update UI
        completedCount++;
        setDeletionProgress({ current: completedCount, total: snapshotsToDelete.length, snapshot: "" });
        toast.message = `${completedCount}/${selectedSnapshots.size} completed`;
      } catch (error: unknown) {
        let errorMessage = "Unknown error";
        let isAuthError = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          // Cast to access stderr/stdout from exec errors
          const execError = error as Error & { stderr?: string; stdout?: string };

          // Check stderr
          if (execError.stderr) {
            const stderrStr = String(execError.stderr);
            errorMessage = stderrStr;

            // Detect authentication errors
            if (stderrStr.includes("Sorry") || stderrStr.includes("incorrect password")) {
              isAuthError = true;
              authFailed = true;
            }
          }

          // Check stdout for other messages
          if (execError.stdout) {
            const stdoutStr = String(execError.stdout);
            if (errorMessage === "Unknown error") {
              errorMessage = stdoutStr;
            }
          }
        }

        results.push({
          snapshot: snapshotDate,
          success: false,
          error: errorMessage,
        });

        // If authentication error, show error
        if (isAuthError) {
          showToast({
            style: Toast.Style.Failure,
            title: "Authentication Failed",
            message: "Incorrect password. Stopping deletion.",
          });
        }

        // Increment counter also for failures
        completedCount++;
        toast.message = `${completedCount}/${selectedSnapshots.size} completed`;
      }
    });

    // Show results
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (failed === 0) {
      toast.style = Toast.Style.Success;
      toast.title = "All snapshots deleted successfully";
      toast.message = `${successful} snapshot(s) deleted`;
    } else if (successful === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete snapshots";

      // Show the first error in toast
      const firstError = results.find((r) => !r.success);
      if (firstError && firstError.error) {
        toast.message = `Error: ${firstError.error.substring(0, 100)}...`;
      } else {
        toast.message = `All ${failed} deletion(s) failed`;
      }
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Partially completed";
      toast.message = `${successful} deleted, ${failed} failed`;
    }

    // Show a toast with details for each error (max 3)
    const failedResults = results.filter((r) => !r.success);
    if (failedResults.length > 0) {
      const errorsToShow = failedResults.slice(0, 3);
      for (const result of errorsToShow) {
        setTimeout(() => {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed: ${result.snapshot}`,
            message: result.error?.substring(0, 200) || "Unknown error",
          });
        }, 1000);
      }

      if (failedResults.length > 3) {
        setTimeout(() => {
          showToast({
            style: Toast.Style.Failure,
            title: "More errors",
            message: `${failedResults.length - 3} more deletion(s) failed`,
          });
        }, 2000);
      }
    }

    setIsDeleting(false);
    setSelectedSnapshots(new Set());
    await loadSnapshots(); // Reload the list
  }

  function handleDelete() {
    if (selectedSnapshots.size === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No snapshots selected",
        message: "Please select at least one snapshot to delete",
      });
      return;
    }
    push(<PasswordForm onSubmit={deleteSnapshots} />);
  }

  // Show progress screen during deletion (prevents exiting)
  if (isDeleting) {
    return (
      <DeletionProgress
        progress={deletionProgress.current}
        total={deletionProgress.total}
        currentSnapshot={deletionProgress.snapshot}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search snapshots..." navigationTitle="Time Machine Snapshots">
      {snapshots.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No Snapshots Found"
          description="There are no local Time Machine snapshots on this system"
        />
      ) : (
        <>
          <List.Section title={`${snapshots.length} Snapshot(s) - ${selectedSnapshots.size} Selected`}>
            {snapshots.map((snapshot) => {
              const isSelected = selectedSnapshots.has(snapshot.id);
              return (
                <List.Item
                  key={snapshot.id}
                  title={snapshot.displayName}
                  subtitle={snapshot.id}
                  icon={{
                    source: isSelected ? Icon.CheckCircle : Icon.Circle,
                    tintColor: isSelected ? Color.Green : Color.SecondaryText,
                  }}
                  accessories={[
                    {
                      text: isSelected ? "Selected" : "",
                      icon: isSelected ? Icon.Checkmark : undefined,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.XMarkCircle : Icon.CheckCircle}
                        onAction={() => toggleSnapshot(snapshot.id)}
                      />
                      <Action
                        title="Delete Selected"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={handleDelete}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                      <ActionPanel.Section>
                        <Action
                          title="Select All"
                          icon={Icon.CheckCircle}
                          onAction={selectAll}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        />
                        <Action
                          title="Deselect All"
                          icon={Icon.XMarkCircle}
                          onAction={deselectAll}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          onAction={loadSnapshots}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Settings">
                        <Action
                          title="Open Extension Settings"
                          icon={Icon.Gear}
                          onAction={openCommandPreferences}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
