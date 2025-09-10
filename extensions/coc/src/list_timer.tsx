import { Action, ActionPanel, List, confirmAlert } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { Account, getAccounts, saveAccounts } from "./storage"; // Removed unused Timer import
import AddTimerForm from "./add_timer";
import EditNameForm from "./edit_name";
import EditTimerForm from "./edit_timer";
import { formatTime } from "./utils";

interface Props {
  account: Account;
  setAccounts: (updater: (prev: Account[]) => Account[]) => void;
}

export default function ListTimer({ account: initialAccount, setAccounts }: Props) {
  const { push } = useNavigation();
  const [localAccount, setLocalAccount] = useState<Account>(initialAccount); // Local state for display
  const updateRef = useRef(false); // Track if an actual update happened

  // Refresh from storage every 5 seconds
  useEffect(() => {
    const refresh = async () => {
      const current = await getAccounts();
      const refreshedAccount = current.find((a) => a.name === initialAccount.name);
      if (refreshedAccount && JSON.stringify(refreshedAccount.timers) !== JSON.stringify(localAccount.timers)) {
        setLocalAccount(refreshedAccount);
        if (!updateRef.current) {
          console.log("Timers refreshed for", initialAccount.name); // Log only on first actual change
          updateRef.current = true; // Set flag to prevent multiples
        }
      } else {
        updateRef.current = false; // Reset flag if no change
      }
    };

    refresh(); // Initial refresh on mount

    const interval = setInterval(refresh, 5000); // Every 5 seconds
    return () => clearInterval(interval); // Cleanup
  }, [initialAccount.name]); // Depend on account name

  const handleDelete = async (timerName: string) => {
    if (await confirmAlert({ title: "Delete Timer?" })) {
      const current = await getAccounts();
      const updatedTimers = localAccount.timers.filter((t) => t.name !== timerName);
      const updatedAccounts = current.map((a) => (a.name === localAccount.name ? { ...a, timers: updatedTimers } : a));
      await saveAccounts(updatedAccounts);
      setAccounts((prev) => prev.map((a) => (a.name === localAccount.name ? { ...a, timers: updatedTimers } : a)));
      setLocalAccount({ ...localAccount, timers: updatedTimers });
      console.log("Deleted timer:", timerName); // Debug log
    }
  };

  // Sort timers: available at top (treat as 0), then by remaining time (ascending), secondary by name
  const sortedTimers = [...localAccount.timers].sort((a, b) => {
    const remA = a.endTimestamp ? Math.max(0, a.endTimestamp - Date.now()) : 0; // Available as 0 (top)
    const remB = b.endTimestamp ? Math.max(0, b.endTimestamp - Date.now()) : 0; // Available as 0 (top)
    if (remA === remB) return a.name.localeCompare(b.name); // Secondary: alphabetical
    return remA - remB; // Primary: shortest remaining first (available at top)
  });

  return (
    <List>
      {sortedTimers.map((timer) => {
        const status = timer.endTimestamp ? formatTime(Math.max(0, timer.endTimestamp - Date.now())) : "Available";
        return (
          <List.Item
            key={timer.name}
            title={timer.name}
            subtitle={status}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Timer"
                  onAction={() => {
                    console.log("Edit Timer clicked for", timer.name); // Debug log
                    push(<EditTimerForm timer={timer} account={localAccount} setAccounts={setAccounts} />);
                  }}
                />
                <Action
                  title="Edit Name"
                  onAction={() => {
                    console.log("Edit Name clicked for", timer.name); // Debug log
                    push(<EditNameForm timer={timer} account={localAccount} setAccounts={setAccounts} />);
                  }}
                />
                <Action title="Delete" onAction={() => handleDelete(timer.name)} />
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        title="Add Timer"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Timer"
              target={<AddTimerForm account={localAccount} setAccounts={setAccounts} />}
              onPush={() => console.log("Pushed to AddTimerForm")} // Debug log
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
