import { LocalStorage, Toast, showToast, useNavigation } from "@raycast/api";
import { TimeEntry, TimeEntryForm } from "../components/time-entry-form";

interface AddTimeProps {
  onAdd: () => void;
}

export function AddTime({ onAdd }: AddTimeProps) {
  const { pop } = useNavigation();

  const handleSubmit = async (entry: TimeEntry) => {
    const times = await LocalStorage.getItem<string>("times");
    const newTimes = times ? JSON.parse(times) : [];

    newTimes.push({
      profileImage: entry.profileImage,
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

  return <TimeEntryForm handleSubmit={handleSubmit} />;
}
