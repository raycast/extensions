import {
  Action,
  ActionPanel,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useState } from "react";
import AddProgressForm, { AddProgressFormValue } from "./components/AddProgressForm";
import ProgressActionPanel from "./components/ProgressActionPanel";
import ProgressDetail from "./components/ProgressDetail";
import { useCachedProgressState } from "./hooks";
import { Progress } from "./types";
import { getIcon } from "./utils/icon";
import { getProgressNumber, getProgressSubtitle, getYear } from "./utils/progress";

export default function XInProgress() {
  const navigation = useNavigation();

  const [userProgress, setUserProgress] = useCachedProgressState();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const onShowDetails = useCallback(() => {
    setIsShowingDetail((prev) => !prev);
  }, []);

  const onChangeShowFromMenuBar = useCallback(
    async (currentProgress: Progress) => {
      const newUserProgress = userProgress.map((progress) => {
        if (progress.title === currentProgress.title) {
          return { ...progress, showInMenuBar: !progress.showInMenuBar };
        }
        return progress;
      });
      setUserProgress(newUserProgress);

      await showToast({
        style: Toast.Style.Success,
        title: `"${currentProgress.title}" is ${currentProgress.showInMenuBar ? "hidden" : "shown"} from the Menu Bar!`,
      });

      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    },
    [userProgress]
  );

  const onEditProgress = useCallback(
    (currentProgress: Progress) => {
      navigation.push(
        <AddProgressForm
          defaultFormValues={currentProgress}
          onSubmit={async (values: AddProgressFormValue) => {
            try {
              setUserProgress(
                userProgress.map((progress) => {
                  if (progress.title === values.title) {
                    return {
                      ...values,
                      key: values.title,
                    };
                  }
                  return progress;
                })
              );
              navigation.pop();
              await showToast({
                style: Toast.Style.Success,
                title: `${values.title} is updated!`,
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
    },
    [userProgress]
  );

  const onPinProgress = useCallback(
    async (currentProgress: Progress) => {
      const newUserProgress = userProgress.map((progress) => {
        if (progress.title === currentProgress.title) {
          return { ...progress, pinned: !progress.pinned };
        }
        return progress;
      });
      setUserProgress(newUserProgress);

      await showToast({
        style: Toast.Style.Success,
        title: `"${currentProgress.title}" is ${currentProgress.pinned ? "unpinned" : "pinned"}!`,
      });

      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    },
    [userProgress]
  );

  const onAddProgress = useCallback(async () => {
    navigation.push(
      <AddProgressForm
        onSubmit={async (values: AddProgressFormValue) => {
          try {
            const newProgress: Progress = {
              ...values,
              key: values.title,
              type: "user",
              editable: true,
            };
            setUserProgress([...userProgress, newProgress]);
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

    await launchCommand({ name: "index", type: LaunchType.UserInitiated });
  }, [userProgress]);

  const onDeleteProgress = useCallback(
    async (title: string) => {
      if (await confirmAlert({ title: "Are you sure?" })) {
        setUserProgress(userProgress.filter((progress) => progress.title !== title));
        await showToast({
          style: Toast.Style.Success,
          title: `${title} is deleted!`,
        });
      }

      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    },
    [userProgress]
  );

  const renderProgress = useCallback(
    (progress: Progress) => {
      const progressNumber = getProgressNumber(progress);
      const subtitle = getProgressSubtitle(progressNumber);
      return (
        <List.Item
          key={progress.key}
          title={progress.title}
          icon={getIcon(progressNumber)}
          subtitle={subtitle}
          detail={<ProgressDetail progress={progress} />}
          actions={
            <ProgressActionPanel
              progress={progress}
              onShowDetails={onShowDetails}
              onChangeShowFromMenuBar={() => onChangeShowFromMenuBar(progress)}
              onEditProgress={onEditProgress}
              onAddProgress={onAddProgress}
              onDeteleProgress={onDeleteProgress}
              onPinProgress={onPinProgress}
            />
          }
        />
      );
    },
    [
      getProgressNumber,
      getProgressSubtitle,
      getIcon,
      onShowDetails,
      onChangeShowFromMenuBar,
      onEditProgress,
      onAddProgress,
      onDeleteProgress,
      onPinProgress,
    ]
  );

  return (
    <List navigationTitle="X In Progress" isShowingDetail={isShowingDetail}>
      <List.Section title="Pinned Progress">{userProgress.filter((p) => p.pinned).map(renderProgress)}</List.Section>

      <List.Section title={`🔵 ${getYear()}`}>
        {userProgress.length == 0 ? (
          <List.Item
            icon={Icon.Plus}
            title="Add New Progress"
            actions={
              <ActionPanel>
                <Action title="Add New Progress" icon={Icon.Plus} onAction={onAddProgress} />
              </ActionPanel>
            }
          />
        ) : (
          userProgress.filter((p) => !p.pinned).map(renderProgress)
        )}
      </List.Section>
    </List>
  );
}
