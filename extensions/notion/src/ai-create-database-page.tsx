import { AI, environment, Toast, type LaunchProps, Clipboard, showToast } from "@raycast/api";

import { useRecentPages } from "./hooks";
import { getValuesFromAI } from "./utils/ai";
import { createDatabasePage, fetchDatabaseProperties } from "./utils/notion";
import { handleOnOpenPage } from "./utils/openPage";
import { CreatePageFormValues } from "./components/forms";
import { APIResponseError } from "@notionhq/client";

type Props = LaunchProps<{
  launchContext: CreatePageFormValues & { conditions: string };
}>;

export default async function Command(props: Props) {
  if (!environment.canAccess(AI)) {
    await showToast({ title: "You need to Raycast Pro to use this command", style: Toast.Style.Failure });
    return;
  }

  if (!props.launchContext?.database) {
    await showToast({
      title: "Cannot call command directly",
      message: "This command must only be used in a quicklink, created in the `Create Database Page` command.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const databaseId = props.launchContext?.database;
  const toast = await showToast({ title: "Fetching database props", style: Toast.Style.Animated });
  try {
    const databaseProperties = await fetchDatabaseProperties(databaseId);

    toast.title = "Asking AI";

    const values = await getValuesFromAI(databaseProperties, databaseId, props.launchContext.conditions);

    console.log(values);

    toast.title = "Creating page";

    const page = await createDatabasePage(values);

    if (!page) {
      toast.title = "Failed to create page";
      toast.style = Toast.Style.Failure;
      return;
    }

    toast.title = "Created page";
    toast.style = Toast.Style.Success;

    toast.primaryAction = {
      title: "Open Page",
      shortcut: { modifiers: ["cmd"], key: "o" },
      onAction: () => handleOnOpenPage(page, useRecentPages().setRecentPage),
    };

    toast.secondaryAction = page.url
      ? {
        title: "Copy URL",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: () => {
          Clipboard.copy(page.url as string);
        },
      }
      : undefined;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create page";
    if (e instanceof Error || e instanceof APIResponseError) {
      toast.message = e.message;
    }
  }
}
