import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { Account, Timer, getAccounts, saveAccounts } from "./storage";

interface Props {
  timer: Timer;
  account: Account;
  setAccounts: (updater: (prev: Account[]) => Account[]) => void;
}

export default function EditTimerForm({ timer, account, setAccounts }: Props) {
  const { pop } = useNavigation();

  // Calculate remaining time for prefill
  const remainingMs = timer.endTimestamp ? Math.max(0, timer.endTimestamp - Date.now()) : 0;
  const defaultHours = Math.floor(remainingMs / 3600000).toString();
  const defaultMinutes = Math.floor((remainingMs % 3600000) / 60000).toString();

  console.log("Prefilled values - Hours:", defaultHours, "Minutes:", defaultMinutes); // Debug log

  const handleSubmit = async (values: { hours: string; minutes: string }) => {
    const h = parseInt(values.hours) || 0;
    const m = parseInt(values.minutes) || 0;
    let message = "";

    try {
      const current = await getAccounts();
      let updatedTimers;
      if (h === 0 && m === 0) {
        updatedTimers = account.timers.map((t) => (t.name === timer.name ? { ...t, endTimestamp: undefined } : t));
        message = `Cleared timer for ${timer.name}`;
        console.log("Clearing timer:", timer.name); // Debug log
      } else {
        const duration = h * 3600000 + m * 60000;
        const end = Date.now() + duration;
        updatedTimers = account.timers.map((t) => (t.name === timer.name ? { ...t, endTimestamp: end } : t));
        message = `Updated timer for ${timer.name}`;
        console.log("Setting timer:", timer.name, "End:", end); // Debug log
      }

      const updatedAccounts = current.map((a) => (a.name === account.name ? { ...a, timers: updatedTimers } : a));
      await saveAccounts(updatedAccounts);

      // Update parent state immediately
      setAccounts((prev) => prev.map((a) => (a.name === account.name ? { ...a, timers: updatedTimers } : a)));
      console.log("Parent state updated after submit"); // Debug log

      showToast({ style: Toast.Style.Success, title: message });
      pop();
    } catch (error) {
      console.error("Error updating timer:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to update timer" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="hours" title="Hours" placeholder="0" defaultValue={defaultHours} />
      <Form.TextField id="minutes" title="Minutes" placeholder="0" defaultValue={defaultMinutes} />
    </Form>
  );
}
