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
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  concurrency: string;
}

interface Snapshot {
  id: string;
  date: string;
  displayName: string;
  size?: string;
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
      const executePromise = promise.then(() => {
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

// Helper to verify administrator password
async function verifyPassword(password: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Escape single quotes in the password
    const escapedPassword = password.replace(/'/g, "'\\''");

    // Verify password with sudo -v (validate) without executing commands
    // First invalidate cached credentials with sudo -k
    const command = `sudo -k && printf '%s\\n' '${escapedPassword}' | sudo -S -v 2>&1`;

    await execAsync(command, { timeout: 10000 });
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
    console.log("[LOAD] Loading snapshots...");
    setIsLoading(true);
    try {
      const result = await execAsync("tmutil listlocalsnapshots /");
      console.log("[LOAD] tmutil output:", result.stdout);

      const lines = result.stdout.trim().split("\n");
      console.log("[LOAD] Found lines:", lines.length);

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
          // Formato: com.apple.TimeMachine.2024-01-13-120000.local
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
              displayName: `Time Machine - ${day}/${month}/${year} ${hour}:${minute}:${second}`,
            };
          }

          // Case 2: Arq or other backup software snapshot
          // Formato: com_haystacksoftware_arqagent_UUID_N
          if (trimmedLine.startsWith("com_") || trimmedLine.includes("_")) {
            // Remove .local if present
            const snapshotId = trimmedLine.replace(".local", "");

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
            };
          }

          return null;
        })
        .filter((s): s is Snapshot => s !== null);

      console.log("[LOAD] Parsed snapshots:", snapshotList);
      setSnapshots(snapshotList);

      if (snapshotList.length === 0) {
        console.log("[LOAD] No snapshots found");
        showToast({
          style: Toast.Style.Success,
          title: "No snapshots found",
          message: "There are no local Time Machine snapshots to clean",
        });
      } else {
        console.log(`[LOAD] Successfully loaded ${snapshotList.length} snapshot(s)`);
      }
    } catch (error) {
      console.error("[LOAD] Error loading snapshots:", error);
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

    console.log(`[DELETE] Starting deletion of ${selectedSnapshots.size} snapshot(s)`);

    setIsDeleting(true);
    setDeletionProgress({ current: 0, total: selectedSnapshots.size, snapshot: "" });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting snapshots...",
      message: `0/${selectedSnapshots.size} completed`,
    });

    const results: DeletionResult[] = [];
    const snapshotsToDelete = Array.from(selectedSnapshots);

    console.log("[DELETE] Snapshots to delete:", snapshotsToDelete);

    // Escape single quotes in the password (replace ' with '\\''')
    // The password will be enclosed in single quotes which don't interpret special characters
    const escapeSingleQuote = (pwd: string) => {
      return pwd.replace(/'/g, "'\\''");
    };

    const escapedPassword = escapeSingleQuote(password);
    console.log("[DELETE] Password prepared for shell (special chars protected)");

    // Read user preference for concurrency
    const preferences = getPreferenceValues<Preferences>();
    const concurrencyLimit = parseInt(preferences.concurrency || "3", 10);
    console.log(`[DELETE] Using concurrency limit: ${concurrencyLimit} thread(s)`);

    // Thread-safe counter for progress tracking
    let completedCount = 0;
    let authFailed = false;

    // Delete in parallel with concurrency limit
    await runWithConcurrencyLimit(snapshotsToDelete, concurrencyLimit, async (snapshotDate, index) => {
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
        console.log(`[DELETE ${index + 1}/${snapshotsToDelete.length}] Deleting snapshot: ${snapshotDate}`);
        setDeletionProgress({ current: completedCount, total: snapshotsToDelete.length, snapshot: snapshotDate });

        // Use printf with single quotes to protect all special characters ($, `, ", \, !)
        // Use absolute path for tmutil to avoid PATH issues with sudo
        const command = `printf '%s\\n' '${escapedPassword}' | sudo -S /usr/bin/tmutil deletelocalsnapshots ${snapshotDate}`;

        const result = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });

        console.log(`[DELETE ${index + 1}/${snapshotsToDelete.length}] Success for ${snapshotDate}`);
        if (result.stdout) {
          console.log(`[DELETE ${index + 1}/${snapshotsToDelete.length}] Output:`, result.stdout);
        }

        results.push({ snapshot: snapshotDate, success: true });

        // Incrementa counter e aggiorna UI
        completedCount++;
        setDeletionProgress({ current: completedCount, total: snapshotsToDelete.length, snapshot: "" });
        toast.message = `${completedCount}/${selectedSnapshots.size} completed`;
      } catch (error: unknown) {
        console.error(`[DELETE ${index + 1}/${snapshotsToDelete.length}] Failed for ${snapshotDate}`);

        let errorMessage = "Unknown error";
        let isAuthError = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          // Cast to access stderr/stdout from exec errors
          const execError = error as Error & { stderr?: string; stdout?: string };

          // Check stderr
          if (execError.stderr) {
            const stderrStr = String(execError.stderr);
            console.error(`[DELETE ${index + 1}/${snapshotsToDelete.length}] stderr:`, stderrStr);
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
            console.error(`[DELETE ${index + 1}/${snapshotsToDelete.length}] stdout:`, stdoutStr);
            if (errorMessage === "Unknown error") {
              errorMessage = stdoutStr;
            }
          }
        }

        console.error(`[DELETE ${index + 1}/${snapshotsToDelete.length}] Error details:`, errorMessage);

        results.push({
          snapshot: snapshotDate,
          success: false,
          error: errorMessage,
        });

        // If authentication error, show error
        if (isAuthError) {
          console.error("[DELETE] Authentication failed");
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

    console.log("[DELETE] All deletion attempts completed. Results:", results);

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

    // Show error details in console and as separate toast
    const failedResults = results.filter((r) => !r.success);
    if (failedResults.length > 0) {
      console.error("[DELETE] Failed deletions details:", failedResults);

      // Show a toast with details for each error (max 3)
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
            message: `${failedResults.length - 3} more deletion(s) failed. Check console logs.`,
          });
        }, 2000);
      }
    }

    setIsDeleting(false);
    setSelectedSnapshots(new Set());
    await loadSnapshots(); // Reload the list
  }

  function handleDelete() {
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
                      <ActionPanel.Section title="About">
                        <Action
                          title="View on GitHub"
                          icon={Icon.Code}
                          onAction={() => open("https://github.com/mattiacolombomc")}
                        />
                        <Action
                          title="Created by @Mattiacolombomc"
                          icon={Icon.Person}
                          onAction={() => open("https://github.com/mattiacolombomc")}
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
