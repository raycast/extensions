import { getPreferenceValues } from "@raycast/api";
import AddTaskForm from "./components/AddTaskForm";

export default function QuickTask() {
  const { targetNote } = getPreferenceValues<Preferences.QuickTask>();
  return <AddTaskForm title="Quick Task" targetNoteName={targetNote?.trim()} closeOnSubmit />;
}
