import { LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { TimeEntry, TimeEntryForm } from "../components/time-entry-form";
import { useState } from "react";

interface AddTimeProps {
  onAdd: () => void;
}

export function AddTime({ onAdd }: AddTimeProps) {
  const { pop } = useNavigation();
  const [errors, setErrors] = useState<Record<string, string>>();

  const handleSubmit = async (entry: TimeEntry) => {
    const times = await LocalStorage.getItem<string>("times");
    const newTimes = times ? JSON.parse(times) : [];

    // Check if the name already exists
    const index = newTimes.findIndex((time: { name: string }) => time.name === entry.name);
    if (index !== -1) {
      setErrors({ name: "Name already exists" });
      return;
    }

    newTimes.push({
      name: entry.name,
      timezone: entry.timezone,
      favorite: false,
      favoritePosition: 0,
    });
    await LocalStorage.setItem("times", JSON.stringify(newTimes));
    showToast({
      title: "Time added",
      style: Toast.Style.Success,
    });
    onAdd();
    pop();
  };

  return <TimeEntryForm errors={errors} handleSubmit={handleSubmit} />;
}
