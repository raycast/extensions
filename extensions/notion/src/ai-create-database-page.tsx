import { AI, Detail, environment, Toast, type LaunchProps, Clipboard } from "@raycast/api";

import { useRecentPages } from "./hooks";
import { getValues } from "./utils/ai";
import { createDatabasePage } from "./utils/notion";
import { handleOnOpenPage } from "./utils/openPage";

type Props = LaunchProps<{
  arguments: Arguments.AiCreateDatabasePage;
  launchContext: { databaseId: string };
}>;

export default async function Command(props: Props) {
  if (!environment.canAccess(AI)) {
    return <Detail markdown="You need to Raycast Pro to use this command." />;
  }

  const databaseId = props.launchContext?.databaseId;
  const { values, toast } = await getValues(databaseId, props.arguments.conditions);

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
}

// TODO: need another command that actually creates the "AI command"
// setting the default values
// which ones leave blank
// prompt / template for generating page content
// etc
