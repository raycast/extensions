import { Icon, MenuBarExtra, open, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface SubscriptionResponse {
  total_results: number;
}

const preferences = getPreferenceValues<Preferences>();

const BASE_URL = `https://api.beehiiv.com/v2/publications/${preferences.publicationId}/subscriptions?limit=1&status=active`;

export default function SubscriberCount() {
  const { data, isLoading, mutate } = useFetch<SubscriptionResponse>(BASE_URL, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
  });
  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={Icon.TwoPeople}
      tooltip="Your Subscribers Count"
      title={data?.total_results.toLocaleString() ?? ""}
    >
      <MenuBarExtra.Item
        title="Dashboard"
        icon={Icon.AppWindowGrid2x2}
        onAction={() => open("https://app.beehiiv.com/")}
      />

      <MenuBarExtra.Item
        title="Manage posts"
        icon={Icon.Document}
        onAction={() => open("https://app.beehiiv.com/posts")}
      />
      <MenuBarExtra.Item
        title="Manage subscribers"
        icon={Icon.TwoPeople}
        onAction={() => open("https://app.beehiiv.com/subscribers")}
      />

      <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => mutate()} />
    </MenuBarExtra>
  );
}
