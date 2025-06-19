import { closeMainWindow, getFrontmostApplication, showHUD } from "@raycast/api";
import addItem from "./helpers/addItem";

export default async function addApplication(position: "first" | "last" | number) {
  const application = await getFrontmostApplication();

  if (!application) {
    return await showHUD("No application is running");
  }

  const { didAddItem, index } = await addItem(
    {
      name: application.name,
      path: application.path,
      isSticky: false,
    },
    position
  );

  if (didAddItem) {
    await showHUD(`"${application.name}" added at position ${index + 1}`);
  } else {
    await showHUD(`"${application.name}" already exists at position ${index + 1}`);
  }

  await closeMainWindow();
}
