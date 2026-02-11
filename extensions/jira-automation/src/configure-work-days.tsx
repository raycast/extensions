import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import WorkDaysForm from "./components/WorkDaysForm";

interface Preferences {
  workDays?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const {
    data: storedWorkDays,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    const item = await LocalStorage.getItem<string>("workDays");
    if (item) {
      try {
        return JSON.parse(item) as string[];
      } catch (e) {
        console.error("Failed to parse workDays from LocalStorage", e);
      }
    }
    return (
      preferences.workDays
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || ["1", "2", "3", "4", "5"]
    );
  }, []);

  if (isLoading) return null;

  return <WorkDaysForm initialDays={storedWorkDays || ["1", "2", "3", "4", "5"]} onDone={revalidate} />;
}
