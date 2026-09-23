import { closeMainWindow, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createReminder } from "swift:../swift/AppleReminders";

import { CreateReminderForm, NewReminder } from "./create-reminder";
import { BrowserTab, getActiveBrowserTab } from "./helpers/browser";
import { useData } from "./hooks/useData";
import usePostCreateActions from "./hooks/usePostCreateActions";
import { runPostCreateActions } from "./post-create-shortcuts";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.CreateReminderFromCurrentTab>();
  const { data, isLoading: isLoadingData } = useData();
  const { value: postCreateActions } = usePostCreateActions();

  const [tab, setTab] = useState<BrowserTab | undefined>(undefined);
  const [isLoadingTab, setIsLoadingTab] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const activeTab = await getActiveBrowserTab();

        if (preferences.createImmediately) {
          if (!activeTab) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No active browser tab found",
              message: "Make sure a supported browser is open with an active tab.",
            });
            setIsLoadingTab(false);
            return;
          }

          let listId: string | undefined;
          const targetDefaultName = preferences.defaultListName?.trim().toLowerCase();
          if (targetDefaultName && data?.lists) {
            const matched = data.lists.find((l) => l.title.trim().toLowerCase() === targetDefaultName);
            if (matched) {
              listId = matched.id;
            }
          }
          if (!listId && data?.lists) {
            const defaultList = data.lists.find((l) => l.isDefault);
            if (defaultList) {
              listId = defaultList.id;
            }
          }

          const payload: NewReminder = {
            title: activeTab.title,
            notes: activeTab.url,
            listId,
          };

          await createReminder(payload);
          await runPostCreateActions(postCreateActions, "create-form");
          await showHUD(`Reminder Created: ${activeTab.title}`);
          await closeMainWindow();
          return;
        }

        if (activeTab) {
          setTab(activeTab);
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "No active browser tab found",
            message: "Showing empty reminder form instead.",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get active tab",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoadingTab(false);
      }
    }

    if (!isLoadingData) {
      init();
    }
  }, [isLoadingData]);

  if (isLoadingTab || isLoadingData) {
    return <CreateReminderForm draftValues={{}} />;
  }

  return (
    <CreateReminderForm
      draftValues={{
        title: tab?.title ?? "",
        notes: tab?.url ?? "",
      }}
    />
  );
}
