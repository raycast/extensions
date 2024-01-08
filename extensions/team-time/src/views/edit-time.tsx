import { LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { TimeEntry, TimeEntryForm } from "../components/time-entry-form";

interface EditTimeProps {
  entry: TimeEntry;
  onEdit: () => void;
}

export function EditTime({ entry, onEdit }: EditTimeProps) {
  const { pop } = useNavigation();

  const handleSubmit = async (e: TimeEntry) => {
    const times = await LocalStorage.getItem<string>("times");
    const newTimes = times ? JSON.parse(times) : [];

    const index = newTimes.findIndex((time: { name: string }) => time.name === entry.name);
    newTimes[index] = e;
    await LocalStorage.setItem("times", JSON.stringify(newTimes));
    showToast({
      title: `${entry.name} updated`,
      style: Toast.Style.Success,
    });
    onEdit();
    pop();
  };

  return <TimeEntryForm entry={entry} handleSubmit={handleSubmit} />;
}
