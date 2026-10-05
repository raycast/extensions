import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

interface CreditsData {
  total_credits: number;
  total_usage: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState<number | undefined>();
  const [totalUsage, setTotalUsage] = useState<number | undefined>();
  const [error, setError] = useState<Error>();

  const preferences = getPreferenceValues<Preferences>();

  async function getCredits() {
    setIsLoading(true);
    await fetch("https://openrouter.ai/api/v1/credits", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.management_key}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json() as Promise<{ data: CreditsData }>;
      })
      .then((body) => {
        setTotalCredits(body.data.total_credits);
        setTotalUsage(body.data.total_usage);
      })
      .catch(() => {
        setError(new Error("Please ensure the management key is correct and try again."));
      });
    setIsLoading(false);
  }

  useEffect(() => {
    getCredits();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const refreshAction = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowCounterClockwise}
        onAction={() => getCredits()}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading}>
      {totalCredits != null && totalUsage != null && (
        <>
          <List.Item title="Total Credits" accessories={[{ text: String(totalCredits) }]} actions={refreshAction} />
          <List.Item title="Total Usage" accessories={[{ text: String(totalUsage) }]} actions={refreshAction} />
          <List.Item
            title="Credits Left"
            accessories={[{ text: String(totalCredits - totalUsage) }]}
            actions={refreshAction}
          />
        </>
      )}
    </List>
  );
}
