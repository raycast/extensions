import {
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  LaunchProps,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { appendToDailyNote, ReflectApiError } from "./helpers/api";
import { prependNote } from "./helpers/dates";
import { authorize } from "./helpers/oauth";

export default async (props: LaunchProps<{ arguments: Arguments.QuickAppend }>) => {
  const preferences: Preferences.QuickAppend & Preferences = getPreferenceValues();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Appending to Reflect Daily Note...",
  });

  const searchString = props.arguments.list || "";

  const parentLists: string[] = preferences.parentLists?.split(",").map((s) => s.trim()) || [];

  const matchedLists = parentLists.find((list) => list.toLowerCase().search(searchString.toLowerCase()) !== -1);
  const listName = searchString ? matchedLists?.split(",")[0] || preferences.listName : preferences.listName;

  try {
    const authorizationToken = await authorize();
    const text = prependNote(props.fallbackText || props.arguments.text, preferences);

    await appendToDailyNote(authorizationToken, preferences.graphId, text, listName);

    toast.hide();
  } catch (error) {
    if (error instanceof ReflectApiError) {
      toast.style = Toast.Style.Failure;
      toast.title = error.message;

      await confirmAlert({
        title: error.message,
        icon: "reflect.png",
        primaryAction: {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        },
      });
    }
  } finally {
    await closeMainWindow();
  }
};
