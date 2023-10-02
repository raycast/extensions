import {
  Action,
  ActionPanel,
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
import { getIcon } from "./utils/icon";
import { Progress, getProgressNumByDate, getSubtitle } from "./utils/progress";

export default function XInProgress() {
  const navigation = useNavigation();
  const [state, setState, getLatestState] = useLocalStorageProgress();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const onShowingDetails = () => {
    setIsShowingDetail((prev) => !prev);
  };

  const togglePinProgress = (targetProgress: Progress) => {
    setState((prev) => ({
      ...prev,
      allProgress: prev.allProgress.map((progress) => {
        if (progress.key === targetProgress.key) {
          return { ...progress, pinned: !progress.pinned };
        }
        return progress;
      }),
    }));
  };

  const toggleShowInMenubar = async (targetProgress: Progress) => {
    setState((prev) => {
      const shown = targetProgress.menubar.shown ? false : true;
      const newAllProgress = prev.allProgress.map((progress) => {
        if (progress.key === targetProgress.key) {
          return { ...progress, menubar: { shown, title: progress.menubar.title } };
        }
        return progress;
      });
      let nextMenubarProgressKey = prev.currMenubarProgressKey;
      if (shown && !prev.currMenubarProgressKey) {
        nextMenubarProgressKey = targetProgress.key;
      }
      if (!shown && prev.currMenubarProgressKey === targetProgress.key) {
        nextMenubarProgressKey = newAllProgress.filter((p) => p.menubar.shown)[0]?.key;
      }
      return {
        ...prev,
        allProgress: newAllProgress,
        currMenubarProgressKey: nextMenubarProgressKey,
      };
    });

    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  };

  const onEditProgress = (progress: Progress) => {
    navigation.push(
      <AddOrEditProgress
        progress={progress}
        onSubmit={async (values) => {
          const latestState = await getLatestState();
          try {
            // TODO: handle title change
            setState((prev) => {
              const newAllProgress: Progress[] = prev.allProgress.map((progress) => {
                if (progress.title === values.title) {
                  return {
                    key: values.title as string,
                    title: values.title as string,
                    type: "user",
                    pinned: false,
                    startDate: values.startDate.toDateString(),
                    endDate: values.endDate.toDateString(),
                    progressNum: getProgressNumByDate(values.startDate, values.endDate),
                    menubar: {
                      shown: values.showInMenubar,
                      title: values.menubarTitle,
                    },
                  };
                }
                return progress;
              });
              let nextMenubarProgressKey = latestState.currMenubarProgressKey;
              if (!values.showInMenubar && latestState.currMenubarProgressKey === values.title) {
                nextMenubarProgressKey = newAllProgress.filter((p) => p.menubar.shown)[0]?.key;
              }
              return {
                ...prev,
                allProgress: newAllProgress,
                currMenubarProgressKey: nextMenubarProgressKey,
              };
            });
            navigation.pop();
            await showToast({
              style: Toast.Style.Success,
              title: `"${values.title}" is updated!`,
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
              key: values.title as string,
              title: values.title as string,
              type: "user",
              pinned: false,
              startDate: values.startDate.toDateString(),
              endDate: values.endDate.toDateString(),
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

  const onDeleteProgress = async (targetKey: string) => {
    if (await confirmAlert({ title: "Are you sure?" })) {
      setState((prev) => {
        const newAllProgress = prev.allProgress.filter((progress) => progress.key !== targetKey);
        return {
          ...prev,
          allProgress: newAllProgress,
          currMenubarProgressKey:
            prev.currMenubarProgressKey === targetKey
              ? newAllProgress.filter((p) => p.menubar.shown)[0]?.key
              : prev.currMenubarProgressKey,
        };
      });
      await showToast({
        style: Toast.Style.Success,
        title: `${targetKey} is deleted!`,
      });
    }
    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  };

  return (
    <List isLoading={state.isLoading} navigationTitle="X In Progress" isShowingDetail={isShowingDetail}>
      <List.Section title={`🟢 Pinned Progress`}>
        {state.allProgress
          .filter((p) => p.pinned)
          .map((progress) => (
            <List.Item
              key={progress.key}
              title={progress.title}
              subtitle={getSubtitle(progress.progressNum)}
              icon={getIcon(progress.progressNum)}
              detail={<ProgressDetail progress={progress} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Show Details" icon={Icon.AppWindowSidebarLeft} onAction={onShowingDetails} />
                    <Action
                      title={progress.pinned ? "Unpin it" : "Pin it"}
                      icon={Icon.Pin}
                      onAction={() => {
                        togglePinProgress(progress);
                      }}
                    />
                    <Action
                      title={`${progress.menubar.shown ? "Hide From Menu Bar" : "Show In Menu Bar"} `}
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
                </ActionPanel>
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
                key={progress.key}
                title={progress.title}
                subtitle={getSubtitle(progress.progressNum)}
                icon={getIcon(progress.progressNum)}
                detail={<ProgressDetail progress={progress} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action title="Show Details" icon={Icon.AppWindowSidebarLeft} onAction={onShowingDetails} />
                      <Action
                        title={progress.pinned ? "Unpin it" : "Pin it"}
                        icon={Icon.Pin}
                        onAction={() => {
                          togglePinProgress(progress);
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
                          await onDeleteProgress(progress.key);
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))
        )}
      </List.Section>
    </List>
  );
}
