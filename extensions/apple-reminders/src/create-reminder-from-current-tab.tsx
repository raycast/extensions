import { closeMainWindow, Form, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { createReminder } from "swift:../swift/AppleReminders";

import { CreateReminderForm, NewReminder } from "./create-reminder";
import { BrowserTab, getActiveBrowserTab } from "./helpers/browser";
import { useData } from "./hooks/useData";
import usePostCreateActions from "./hooks/usePostCreateActions";
import { formatDueDate, parseDueDate } from "./parse-due-date";
import { runPostCreateActions } from "./post-create-shortcuts";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.CreateReminderFromCurrentTab>();
  const { data, isLoading: isLoadingData } = useData();
  const { value: postCreateActions, isLoading: isLoadingPostCreateActions } = usePostCreateActions();

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

          let dueDate: string | undefined;
          if (preferences.defaultDueDate?.trim()) {
            const parsedDue = parseDueDate(preferences.defaultDueDate.trim());
            if (parsedDue) {
              dueDate = formatDueDate(parsedDue);
            }
          }

          const payload: NewReminder = {
            title: activeTab.title,
            url: activeTab.url,
            notes: activeTab.url,
            listId,
            dueDate,
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

    if (!isLoadingData && !isLoadingPostCreateActions) {
      init();
    }
  }, [isLoadingData, isLoadingPostCreateActions]);

  if (isLoadingTab || isLoadingData || isLoadingPostCreateActions) {
    return <Form isLoading={true} />;
  }

  const defaultDueDate = preferences.defaultDueDate?.trim()
    ? parseDueDate(preferences.defaultDueDate.trim())?.date
    : undefined;

  return (
    <CreateReminderForm
      key={tab ? `${tab.browser}-${tab.url}` : "empty-form"}
      draftValues={{
        title: tab?.title ?? "",
        url: tab?.url ?? "",
        notes: tab?.url ?? "",
        dueDate: defaultDueDate,
      }}
    />
  );
}
