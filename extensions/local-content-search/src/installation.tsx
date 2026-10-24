import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  installationState,
  installService,
  removeService,
} from "../service/install";

// Commands -> shared setup gate -> verified installer. Folder access always waits for user selection.
export function InstallationGate({ children }: { children?: ReactNode }) {
  const [state, setState] = useState("checking");
  const [stage, setStage] = useState("Checking local installation");
  const [error, setError] = useState<string>();
  const active = useRef(true);
  const lastProgress = useRef(0);
  const preferences = getPreferenceValues<{ helperPath?: string }>();

  async function install() {
    setState("installing");
    setError(undefined);
    try {
      await installService((message, received, total) => {
        // Throttle byte updates so large streams do not flood Raycast's UI bridge.
        if (
          !active.current ||
          (received !== undefined &&
            received !== total &&
            Date.now() - lastProgress.current < 200)
        ) {
          return;
        }
        lastProgress.current = Date.now();
        setStage(
          total === undefined
            ? message
            : `${message}: ${Math.round((received ?? 0) / 1024 ** 2)} / ${Math.round(total / 1024 ** 2)} MB`,
        );
      }, preferences.helperPath);
      if (active.current) {
        setState("ready");
      }
    } catch (failure) {
      if (!active.current) {
        return;
      }
      setError(failure instanceof Error ? failure.message : String(failure));
      setState("error");
      await showFailureToast(failure, { title: "Setup failed" });
    }
  }

  useEffect(() => {
    active.current = true;
    void installationState()
      .then(async (value) => {
        if (!active.current) {
          return;
        }
        if (value === "missing") {
          await install();
          return;
        }
        setState(value);
      })
      .catch((failure) => {
        if (active.current) {
          setError(String(failure));
          setState("error");
        }
      });
    return () => {
      active.current = false;
    };
  }, []);

  if (state === "ready" && children) {
    return <>{children}</>;
  }
  const busy = state === "checking" || state === "installing";
  const markdown = `# Local Content Search

${busy ? stage : state === "ready" ? "Installed and ready for offline search." : state === "disabled" ? "The background service has been removed. Install it again when you need it." : "Set up on-device search without Terminal or developer tools."}

${error ? `Setup stopped: ${error}\n\nCheck your connection and free disk space, then choose Retry Setup. No folders were selected automatically.` : ""}

## First setup

The helper and EmbeddingGemma 2 models download once (about 905 MB total). Downloads are pinned and SHA-256 verified. Requires Apple Silicon, macOS 14+, 8 GB RAM, and 4 GB free disk space. Keep this command open until setup finishes.

After setup, open **Manage Content Index → Choose Folders and Limits**. Start with a small folder. No personal folders are selected automatically. macOS may ask you to allow access to a selected folder; that permission needs your approval.

## Background indexing

The per-user login service keeps indexing with Raycast closed. Search and indexing run locally. Pause, exclusions, power policy, and memory limits are in Manage Content Index.

## Remove the service

Choose **Remove Background Service** below. This stops indexing and disables the login service. Your models, index, and settings are retained in ~/Library/Application Support/LocalSearch. Removing the Raycast extension alone does not stop this independent service.
`;

  return (
    <Detail
      isLoading={busy}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!busy && state !== "ready" && (
            <Action
              title={error ? "Retry Setup" : "Install Local Content Search"}
              icon={Icon.Download}
              onAction={install}
            />
          )}
          {state === "ready" && (
            <Action
              title="Choose Folders and Limits"
              icon={Icon.Folder}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "manage",
                    type: LaunchType.UserInitiated,
                  });
                } catch (failure) {
                  await showFailureToast(failure, {
                    title: "Could not open index controls",
                  });
                }
              }}
            />
          )}
          {!busy && state !== "disabled" && (
            <Action
              title="Remove Background Service"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  !(await confirmAlert({
                    title: "Remove background service?",
                    message:
                      "Indexing will stop. Models, settings, and your saved index will be kept.",
                    primaryAction: {
                      title: "Remove Service",
                      style: Alert.ActionStyle.Destructive,
                    },
                  }))
                ) {
                  return;
                }
                try {
                  await removeService();
                  setState("disabled");
                  setError(undefined);
                } catch (failure) {
                  await showFailureToast(failure, { title: "Removal failed" });
                }
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
