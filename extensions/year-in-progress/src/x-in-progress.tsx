import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import AddOrEditProgress from "./components/add-or-edit-progress";
import ProgressDetail from "./components/progress-detail";
import { useLocalStorageProgress } from "./hooks/use-local-storage-progress";
import { CustomProgressId, Progress, ProgressSnapshot } from "./types";
import { getIcon } from "./utils/icon";
import { refreshProgressCommands, supportsMenuBar } from "./utils/platform";
import { getCommandSubtitle, getSubtitle } from "./utils/progress";
import {
  deleteCustomProgress,
  saveCustomProgress,
  selectCommand,
  setMenuBarVisible,
  setPinned,
} from "./utils/progress-store";

export default function XInProgress() {
  const navigation = useNavigation();
  const { state, reload } = useLocalStorageProgress();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const mutationPending = useRef(false);
  const metadataQueue = useRef(Promise.resolve());
  const subtitle = state.isLoading ? undefined : getCommandSubtitle(state);

  useEffect(() => {
    if (subtitle === undefined) return;
    let cancelled = false;
    metadataQueue.current = metadataQueue.current.then(async () => {
      if (cancelled) return;
      try {
        await updateCommandMetadata({ subtitle });
      } catch (error) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Update Command Subtitle",
            message: error instanceof Error ? error.message : String(error),
          }).catch(() => undefined);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [subtitle]);

  const mutate = async (save: () => Promise<unknown>, successTitle: string, onSaved?: () => void) => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setIsMutating(true);
    try {
      try {
        await save();
      } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        let snapshot: ProgressSnapshot | undefined;
        try {
          snapshot = await reload();
        } catch {
          message += " Progress could not be reloaded.";
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Progress Was Not Fully Saved",
          message: `${message} Some changes may have been saved. Review the reloaded list before retrying.`,
        });
        return { saved: false, snapshot };
      }

      const failures: string[] = [];
      try {
        await reload();
      } catch {
        failures.push("List");
      }
      failures.push(...(await refreshProgressCommands()));
      onSaved?.();
      await showToast({
        style: failures.length ? Toast.Style.Failure : Toast.Style.Success,
        title: successTitle,
        message: failures.length
          ? `Saved, but ${failures.join(" and ")} could not refresh. Enable the command or reopen it to refresh.`
          : undefined,
      });
      return { saved: true };
    } finally {
      mutationPending.current = false;
      setIsMutating(false);
    }
  };

  const openProgressForm = (progress?: Extract<Progress, { type: "user" }>) => {
    const id: CustomProgressId = progress?.id ?? `custom:${randomUUID()}`;
    let original = progress;
    let requiresReload = false;
    const rebase = (snapshot: ProgressSnapshot) => {
      const saved = snapshot.allProgress.find((item) => item.id === id);
      if (saved?.type === "user") original = saved;
    };
    navigation.push(
      <AddOrEditProgress
        progress={progress}
        allProgress={state.allProgress}
        onSubmit={async (values) => {
          if (requiresReload) {
            try {
              rebase(await reload());
              requiresReload = false;
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "Could Not Reload Progress",
                message: "Reopen the list before retrying. Some changes may already have been saved.",
              });
              return;
            }
          }
          const result = await mutate(
            () => saveCustomProgress(id, values, original),
            progress ? "Progress Updated" : "Progress Added",
            () => navigation.pop()
          );
          if (result?.saved === false) {
            if (result.snapshot) rebase(result.snapshot);
            requiresReload = !result.snapshot;
          }
        }}
      />
    );
  };

  const deleteProgress = async (progress: Progress) => {
    if (progress.type !== "user") return;
    if (
      await confirmAlert({ title: `Delete "${progress.title}"?`, message: "This custom progress will be removed." })
    ) {
      await mutate(() => deleteCustomProgress(progress.id), "Progress Deleted");
    }
  };

  const addAction = (
    <Action
      title="Add New Progress"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => openProgressForm()}
    />
  );

  const renderProgress = (progress: Progress) => (
    <List.Item
      key={progress.id}
      id={progress.id}
      title={progress.title}
      subtitle={getSubtitle(progress.progressNum)}
      icon={getIcon(progress.progressNum)}
      detail={<ProgressDetail progress={progress} />}
      accessories={state.commandProgressId === progress.id ? [{ tag: "Selected" }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={() => setIsShowingDetail((previous) => !previous)}
            />
            <Action.CopyToClipboard
              title="Copy Progress"
              icon={Icon.CopyClipboard}
              content={getSubtitle(progress.progressNum)}
            />
            <Action
              title={progress.pinned ? "Unpin Progress" : "Pin Progress"}
              icon={Icon.Pin}
              onAction={() => mutate(() => setPinned(progress.id, !progress.pinned), "Pin Updated")}
            />
            {supportsMenuBar && (
              <Action
                title={progress.menubar.shown ? "Hide from Menu Bar" : "Show in Menu Bar"}
                icon={progress.menubar.shown ? Icon.EyeDisabled : Icon.Eye}
                onAction={() =>
                  mutate(() => setMenuBarVisible(progress.id, !progress.menubar.shown), "Menu Bar Visibility Updated")
                }
              />
            )}
            {state.commandProgressId !== progress.id && (
              <Action
                title="Show in Command Subtitle"
                icon={Icon.Eye}
                onAction={() => mutate(() => selectCommand(progress.id), "Command Selection Updated")}
              />
            )}
            {progress.type === "user" && (
              <Action title="Edit Progress" icon={Icon.Pencil} onAction={() => openProgressForm(progress)} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>{addAction}</ActionPanel.Section>
          {progress.type === "user" && (
            <ActionPanel.Section>
              <Action
                title="Delete Progress"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteProgress(progress)}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );

  const customProgress = state.allProgress.filter((progress) => progress.type === "user");

  return (
    <List
      isLoading={state.isLoading || isMutating}
      navigationTitle="X in Progress"
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        !state.isLoading && state.allProgress.length > 0 ? (
          <List.Dropdown
            tooltip="Command Progress"
            value={state.commandProgressId}
            storeValue={false}
            onChange={async (value) => {
              if (state.isLoading || value === state.commandProgressId) return;
              const progress = state.allProgress.find((item) => item.id === value);
              if (!progress) return;
              await mutate(() => selectCommand(progress.id), "Command Progress Updated");
            }}
          >
            <List.Dropdown.Section title="Calendar Progress">
              {state.allProgress
                .filter((progress) => progress.type === "default")
                .map((progress) => (
                  <List.Dropdown.Item key={progress.id} value={progress.id} title={progress.menubar.title} />
                ))}
            </List.Dropdown.Section>
            {customProgress.length > 0 && (
              <List.Dropdown.Section title="Custom Progress">
                {customProgress.map((progress) => (
                  <List.Dropdown.Item key={progress.id} value={progress.id} title={progress.title} />
                ))}
              </List.Dropdown.Section>
            )}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView icon={Icon.Calendar} title="No Progress Found" actions={<ActionPanel>{addAction}</ActionPanel>} />
      <List.Section title="Pinned Progress">
        {state.allProgress.filter((progress) => progress.pinned).map(renderProgress)}
      </List.Section>
      <List.Section title="All Progress">
        {state.allProgress.filter((progress) => !progress.pinned).map(renderProgress)}
      </List.Section>
    </List>
  );
}
