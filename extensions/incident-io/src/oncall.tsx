import { Action, ActionPanel, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

interface Preferences {
  apiKey: string;
}

interface User {
  id?: string;
  name?: string;
  email?: string;
}

interface CurrentShift {
  user?: User | null;
}

interface Schedule {
  id: string;
  name: string;
  current_shifts?: CurrentShift[] | null;
}

function isString(value: string | undefined): value is string {
  return Boolean(value);
}

export default function CurrentOnCallCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchSchedules() {
      try {
        const response = await axios.get<{ schedules: Schedule[] }>("https://api.incident.io/v2/schedules", {
          headers: {
            Authorization: `Bearer ${preferences.apiKey}`,
          },
        });

        if (response.data && Array.isArray(response.data.schedules)) {
          setSchedules(response.data.schedules);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Unexpected API response",
            message: "The API response does not contain valid schedules.",
          });
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch schedules",
          message: String(error),
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSchedules();
  }, [preferences.apiKey]);

  function getCurrentShifts(schedule: Schedule): CurrentShift[] {
    return Array.isArray(schedule.current_shifts) ? schedule.current_shifts : [];
  }

  function getCurrentResponderEmails(schedule: Schedule): string[] {
    return getCurrentShifts(schedule)
      .map((shift) => shift.user?.email)
      .filter(isString);
  }

  function getCurrentResponders(schedule: Schedule): string {
    const responders = getCurrentShifts(schedule)
      .map((shift) => shift.user?.name || shift.user?.email)
      .filter(isString);

    return responders.length > 0 ? responders.join(", ") : "No one currently on-call";
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search schedules...">
      {schedules.map((schedule) => {
        const currentResponders = getCurrentResponders(schedule);
        const currentResponderEmails = getCurrentResponderEmails(schedule);

        return (
          <List.Item
            key={schedule.id}
            title={schedule.name}
            subtitle={`On-call: ${currentResponders}`}
            actions={
              currentResponderEmails.length > 0 && (
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy On-Call Email(s)" content={currentResponderEmails.join(", ")} />
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}
