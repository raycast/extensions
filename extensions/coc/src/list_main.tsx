import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Account, getAccounts, saveAccounts } from "./storage";
import AddAccountForm from "./add_account";
import ListTimer from "./list_timer";
import EditAccountForm from "./edit_account";
import ExportDataForm from "./export_data";
import ImportDataForm from "./import_data"; // Added import
import { getMinRemaining, getClosestTimer, getAvailability, checkCompletions } from "./utils";

export default function ListAccount() {
  const { push } = useNavigation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getAccounts();
      setAccounts(data);
      setIsLoading(false);
    };
    load();

    const interval = setInterval(() => {
      setAccounts((prev) => {
        const updated = checkCompletions(prev);
        saveAccounts(updated);
        return updated;
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const sortedAccounts = [...accounts].sort((a, b) => {
    const availA = getAvailability(a.timers).available;
    const availB = getAvailability(b.timers).available;
    if (availA !== availB) return availB - availA; // Primary: available descending

    const minA = getMinRemaining(a.timers);
    const minB = getMinRemaining(b.timers);
    if (minA !== minB) return minA - minB; // Secondary: remaining ascending

    return a.name.localeCompare(b.name); // Tertiary: alphanumeric
  });

  return (
    <List isLoading={isLoading}>
      {sortedAccounts.map((account) => {
        const { available, total } = getAvailability(account.timers);
        const closest = getClosestTimer(account.timers);
        return (
          <List.Item
            key={account.name}
            title={account.name}
            subtitle={available === total ? "" : closest || ""}
            accessories={[{ text: `${available}/${total}`, color: available > 0 ? "green" : "red" }]}
            actions={
              <ActionPanel>
                <Action
                  title="View Timers"
                  onAction={() => {
                    console.log("View Timers clicked for", account.name); // Debug log
                    push(<ListTimer account={account} setAccounts={setAccounts} />);
                  }}
                />
                <Action
                  title="Rename Account"
                  onAction={() => {
                    console.log("Rename Account clicked for", account.name); // Debug log
                    push(<EditAccountForm account={account} setAccounts={setAccounts} />);
                  }}
                />
                <Action.Push
                  title="Export Data"
                  target={<ExportDataForm />}
                  onPush={() => console.log("Pushed to ExportDataForm")} // Debug log
                />
                <Action.Push
                  title="Import Data"
                  target={<ImportDataForm />}
                  onPush={() => console.log("Pushed to ImportDataForm")} // Debug log
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.Item
        title="Add Account"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Account"
              target={<AddAccountForm setAccounts={setAccounts} />}
              onPush={() => console.log("Pushed to AddAccountForm")} // Debug log
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
