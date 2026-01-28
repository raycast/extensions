import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Activity {
  activity: string;
  type: string;
  participants: number;
  price: number;
  link: string;
  key: string;
  accessibility: number;
}

export default () => {
  const { isLoading, data, revalidate } = useFetch<Activity>("https://www.boredapi.com/api/activity", {
    keepPreviousData: false,
  });

  let markdown = "Loading...";
  if (data) {
    markdown = `# ${data.activity}\n\nType: ${data.type}\n\nParticipants: ${data.participants}\n\nPrice: $${Math.round(data.price * 100)}\n\nAccessibility: ${Math.round(data.accessibility * 100)}%`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
};
