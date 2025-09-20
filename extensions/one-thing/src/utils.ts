import { launchCommand, LaunchType, popToRoot, closeMainWindow, Cache, Toast, showToast } from "@raycast/api";

export async function updateMenubar({ shouldPopAndClose }: { shouldPopAndClose: boolean }) {
  try {
    await launchCommand({ name: "show-one-thing", type: LaunchType.Background });
  } catch (error) {
    console.error(error);
  }

  if (shouldPopAndClose) {
    await popToRoot();
    await closeMainWindow();
  }
}

export async function setTheThing(text: string) {
  const cache = new Cache();
  cache.set("onething", text);

  await updateMenubar({ shouldPopAndClose: true });
  await showToast({ title: "Set One Thing", style: Toast.Style.Success });
}

export async function removeTheThing() {
  const cache = new Cache();
  cache.remove("onething");

  await updateMenubar({ shouldPopAndClose: true });
  await showToast({ title: "Removed One Thing", style: Toast.Style.Success });
}
