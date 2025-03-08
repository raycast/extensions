import { showToast, Toast } from "@raycast/api";
import { AddEasingForm } from "./components/AddEasingForm";

export default function Command() {
  async function handleEasingAdded() {
    await showToast(Toast.Style.Success, "Custom easing added successfully");
  }

  return <AddEasingForm onEasingAdded={handleEasingAdded} />;
}
