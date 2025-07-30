import { LocalStorage, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Category } from "./types";

interface LaunchProps {
  launchContext?: {
    categoryId?: string;
  };
}

// This is the quit logic, copied here to be self-contained.
async function handleQuit(categoryName: string, bundleIds: string[]) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Quitting ${categoryName} apps...`,
  });

  try {
    const quitPromises = bundleIds.map((bundleId) =>
      runAppleScript(`tell application id ${JSON.stringify(bundleId)} to quit`),
    );
    await Promise.all(quitPromises);

    toast.style = Toast.Style.Success;
    toast.title = `Successfully quit ${categoryName} apps`;
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to quit apps";
    toast.message = error instanceof Error ? error.message : "An unknown error occurred";
  }
}

export default async function Command(props: LaunchProps) {
  const categoryId = props.launchContext?.categoryId;

  if (!categoryId) {
    await showToast({ style: Toast.Style.Failure, title: "No category ID provided" });
    return;
  }

  // 1. Find the category from storage
  const storedCategories = await LocalStorage.getItem<string>("categories");
  const categories: Category[] = storedCategories ? JSON.parse(storedCategories) : [];
  const targetCategory = categories.find((cat) => cat.id === categoryId);

  if (!targetCategory) {
    await showToast({ style: Toast.Style.Failure, title: "Could not find the specified category" });
    return;
  }

  // TODO: Any conversion from bundleId to display name should happen in the UI, not in this quit logic.

  // 2. If found, execute the quit logic
  await handleQuit(targetCategory.name, targetCategory.bundleIds);
}
