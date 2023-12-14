import { LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { TimeEntry, TimeEntryForm } from "../components/time-entry-form";
import { useState } from "react";

interface EditTimeProps {
  entry: TimeEntry;
  onEdit: () => void;
}

export function EditTime({ entry, onEdit }: EditTimeProps) {
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<Record<string, string>>();

  const handleSubmit = async (e: TimeEntry) => {
    const times = await LocalStorage.getItem<string>("times");
    const newTimes = times ? JSON.parse(times) : [];

    // Check if the name already exists and is not the current entry
    const indexExists = newTimes.findIndex((time: { name: string }) => time.name === e.name);
    if (indexExists !== -1 && e.name !== entry.name) {
      setErrors({ name: "Name already exists" });
      return;
    }

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

  return <TimeEntryForm entry={entry} errors={errors} handleSubmit={handleSubmit} />;
}
