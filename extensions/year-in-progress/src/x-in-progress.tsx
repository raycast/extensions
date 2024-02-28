import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import AddOrEditProgress from "./components/add-or-edit-progress";
import ProgressDetail from "./components/progress-detail";
import { useLocalStorageProgress } from "./hooks/use-local-storage-progress";
import { Progress } from "./types";
import { getIcon } from "./utils/icon";
import { getProgressNumByDate, getSubtitle } from "./utils/progress";

export default function XInProgress() {
  const navigation = useNavigation();
  const [state, setState, getLatestXProgress] = useLocalStorageProgress();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const onShowingDetails = () => {
    setIsShowingDetail((prev) => !prev);
  };

  const togglePinProgress = async (targetProgress: Progress) => {
    setState((prev) => ({
      ...prev,
      allProgress: prev.allProgress.map((progress) => {
        if (progress.title === targetProgress.title) {
          return { ...progress, pinned: !progress.pinned };
        }
        return progress;
      }),
    }));

    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  };

  const toggleShowInMenubar = async (targetProgress: Progress) => {
    const latestXProgress = await getLatestXProgress();

    // 1. Toogle `menubar.shown` for target progress
    const allProgress = latestXProgress.allProgress.map((progress) => {
      if (progress.title === targetProgress.title) {
        return { ...progress, menubar: { shown: !progress.menubar.shown, title: progress.menubar.title } };
      }
      return progress;
    });

    // 2. If it is already been shown in menubar, find a next one to replace
    let currMenubarProgressTitle = latestXProgress.currMenubarProgressTitle;
    if (latestXProgress.currMenubarProgressTitle === targetProgress.title) {
      currMenubarProgressTitle = allProgress.filter((p) => p.menubar.shown)[0]?.title;
    }

    // 3. If there has nothing to show in menubar
    if (!latestXProgress.currMenubarProgressTitle) {
      const isToggleToShow = targetProgress.menubar.shown ? false : true;
      if (isToggleToShow) {
        currMenubarProgressTitle = targetProgress.title;
      }
    }

    setState((prev) => ({
      ...prev,
      allProgress,
      currMenubarProgressTitle,
    }));

    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  };

  const onEditProgress = (targetProgress: Progress) => {
    navigation.push(
      <AddOrEditProgress
        progress={targetProgress}
        onSubmit={async (values) => {
          const latestXProgress = await getLatestXProgress();
          try {
            // 1. Update progress
            const allProgress: Progress[] = latestXProgress.allProgress.map((progress) => {
              if (progress.title === targetProgress.title) {
                return {
                  title: progress.title,
                  type: "user",
                  pinned: progress.pinned,
                  startDate: values.startDate.getTime(),
                  endDate: values.endDate.getTime(),
                  progressNum: getProgressNumByDate(values.startDate, values.endDate),
                  menubar: {
                    shown: values.showInMenubar,
                    title: values.menubarTitle,
                  },
                };
              }
              return progress;
            });

            // 2. If it is already been shown in menubar, and we will turnoff it, find a next one to replace
            let currMenubarProgressTitle = latestXProgress.currMenubarProgressTitle;
            if (latestXProgress.currMenubarProgressTitle === targetProgress.title && !values.showInMenubar) {
              currMenubarProgressTitle = allProgress.filter((p) => p.menubar.shown)[0]?.title;
            }

            // 3. If there has nothing to show in menubar
            if (!latestXProgress.currMenubarProgressTitle) {
              const isToggleToShow = values.showInMenubar;
              if (isToggleToShow) {
                currMenubarProgressTitle = targetProgress.title;
              }
            }

            setState((prev) => ({ ...prev, allProgress, currMenubarProgressTitle }));

            navigation.pop();
            await showToast({
              style: Toast.Style.Success,
              title: `"${targetProgress.title}" is updated!`,
            });
            await launchCommand({ name: "index", type: LaunchType.UserInitiated });
          } catch (err) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to update progress :(",
            });
          }
        }}
      />
    );
  };

  const onAddProgress = () => {
    navigation.push(
      <AddOrEditProgress
        onSubmit={async (values) => {
          try {
            const newProgress: Progress = {
              title: values.title as string,
              type: "user",
              pinned: false,
              startDate: values.startDate.getTime(),
              endDate: values.endDate.getTime(),
              // This will be re-calulated when accessing it
              progressNum: getProgressNumByDate(values.startDate, values.endDate),
              menubar: {
                shown: values.showInMenubar,
                title: values.menubarTitle,
              },
            };
            setState((prev) => ({ ...prev, allProgress: [...prev.allProgress, newProgress] }));
            navigation.pop();
            await showToast({
              style: Toast.Style.Success,
              title: `"${values.title}" is added!`,
            });
          } catch (err) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to add progress :(",
            });
          }
        }}
      />
    );
  };

  const onDeleteProgress = async (targetTitle: string) => {
    if (await confirmAlert({ title: "Are you sure?" })) {
      const latestXProgress = await getLatestXProgress();

      // 1. filter out target progress
      const allProgress = latestXProgress.allProgress.filter((progress) => progress.title !== targetTitle);

      // 2. if it is been shown in menubar, find a new one to replace
      let currMenubarProgressTitle = latestXProgress.currMenubarProgressTitle;
      if (latestXProgress.currMenubarProgressTitle === targetTitle) {
        currMenubarProgressTitle = allProgress.filter((p) => p.menubar.shown)[0]?.title;
      }
      setState((prev) => ({ ...prev, allProgress, currMenubarProgressTitle }));

      await showToast({
        style: Toast.Style.Success,
        title: `${targetTitle} is deleted!`,
      });

      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    }
  };

  return (
    <List isLoading={state.isLoading} navigationTitle="X In Progress" isShowingDetail={isShowingDetail}>
      <List.Section title={`🟢 Pinned Progress`}>
        {state.allProgress
          .filter((p) => p.pinned)
          .map((progress) => (
            <List.Item
              key={progress.title}
              title={progress.title}
              subtitle={getSubtitle(progress.progressNum)}
              icon={getIcon(progress.progressNum)}
              detail={<ProgressDetail progress={progress} />}
              actions={
                <Actions
                  progress={progress}
                  onShowingDetails={onShowingDetails}
                  togglePinProgress={togglePinProgress}
                  toggleShowInMenubar={toggleShowInMenubar}
                  onEditProgress={onEditProgress}
                  onAddProgress={onAddProgress}
                  onDeleteProgress={onDeleteProgress}
                />
              }
            />
          ))}
      </List.Section>

      <List.Section title={`🔵 All Progress`}>
        {state.allProgress.length == 0 ? (
          <List.Item icon={Icon.Plus} title="Add New Progress" actions={<ActionPanel></ActionPanel>} />
        ) : (
          state.allProgress
            .filter((p) => !p.pinned)
            .map((progress) => (
              <List.Item
                key={progress.title}
                title={progress.title}
                subtitle={getSubtitle(progress.progressNum)}
                icon={getIcon(progress.progressNum)}
                detail={<ProgressDetail progress={progress} />}
                actions={
                  <Actions
                    progress={progress}
                    onShowingDetails={onShowingDetails}
                    togglePinProgress={togglePinProgress}
                    toggleShowInMenubar={toggleShowInMenubar}
                    onEditProgress={onEditProgress}
                    onAddProgress={onAddProgress}
                    onDeleteProgress={onDeleteProgress}
                  />
                }
              />
            ))
        )}
      </List.Section>
    </List>
  );
}

function Actions(props: {
  progress: Progress;
  onShowingDetails: () => void;
  togglePinProgress: (targetProgress: Progress) => Promise<void>;
  toggleShowInMenubar: (targetProgress: Progress) => Promise<void>;
  onEditProgress: (targetProgress: Progress) => void;
  onAddProgress: () => void;
  onDeleteProgress: (targetTitle: string) => Promise<void>;
}) {
  const {
    progress,
    onShowingDetails,
    togglePinProgress,
    toggleShowInMenubar,
    onEditProgress,
    onAddProgress,
    onDeleteProgress,
  } = props;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Show Details" icon={Icon.AppWindowSidebarLeft} onAction={onShowingDetails} />
        <Action.CopyToClipboard title="Copy" icon={Icon.CopyClipboard} content={getSubtitle(progress.progressNum)} />
        <Action
          title={progress.pinned ? "Unpin it" : "Pin it"}
          icon={Icon.Pin}
          onAction={async () => {
            await togglePinProgress(progress);
          }}
        />
        <Action
          title={`${progress.menubar.shown ? "Hide From Menu Bar" : "Show In Menu Bar"}`}
          icon={progress.menubar.shown ? Icon.EyeDisabled : Icon.Eye}
          onAction={async () => {
            await toggleShowInMenubar(progress);
          }}
        />
        {progress.type === "user" && (
          <Action
            title="Edit Progress"
            icon={Icon.Pencil}
            onAction={() => {
              onEditProgress(progress);
            }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Add New Progress"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={onAddProgress}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Progress"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            await onDeleteProgress(progress.title);
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
