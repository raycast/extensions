import { Icon, MenuBarExtra, open, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type PublicationResponse = {
  data: {
    id: string;
    name: string;
    organization_name: string;
    referral_program_enabled: boolean;
    created: number;
    stats: {
      active_subscriptions: number;
      active_premium_subscriptions: number;
      active_free_subscriptions: number;
      average_open_rate: number;
      average_click_rate: number;
      total_sent: number;
      total_unique_opened: number;
      total_clicked: number;
    };
  };
};

const preferences = getPreferenceValues();

const BASE_URL = `https://api.beehiiv.com/v2/publications/${preferences.publicationId}?expand=stats`;

export default function SubscriberCount() {
  const { data, isLoading, mutate } = useFetch<PublicationResponse>(BASE_URL, {
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
      title={data?.data.stats.active_subscriptions.toLocaleString() ?? ""}
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
