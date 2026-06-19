import { closeMainWindow, PopToRootType, showHUD } from "@raycast/api";
import { getDeletionBehaviorTitle, toggleDeletionBehavior } from "./utils";

export default async function main() {
  const deletionBehavior = await toggleDeletionBehavior();

  await closeMainWindow({ popToRootType: PopToRootType.Suspended });
  await showHUD(`Deletion Behavior toggled to: ${getDeletionBehaviorTitle(deletionBehavior)}`);
}
