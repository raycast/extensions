import { Action, ActionPanel, Detail, Icon, List, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

const API_BASE_URL = "https://connect.mailerlite.com/api";

interface CampaignStats {
  sent: number;
  opens_count: number;
  unique_opens_count: number;
  clicks_count: number;
  unique_clicks_count: number;
  unsubscribes_count: number;
  spam_count: number;
  open_rate: { string: string };
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  scheduled_for: string;
  stats: CampaignStats;
  emails: Array<{ screenshot_url?: string }>;
}

interface CampaignListResponse {
  data: Campaign[];
}

interface CampaignDetailResponse {
  data: Campaign;
}

const CampaignList = () => {
  const { mailerliteApiKey } = getPreferenceValues<Preferences>();

  const { isLoading, data: campaigns } = useFetch(`${API_BASE_URL}/campaigns?filter[status]=sent`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${mailerliteApiKey}`,
      "Content-Type": "application/json",
    },
    mapResult(result: CampaignListResponse) {
      return {
        data: result.data,
      };
    },
    initialData: [],
    async onError(error) {
      let title = "Failed to fetch campaigns";
      let message = `HTTP error! status: ${error.message}`;

      if (error.message.includes("401")) {
        title = "Invalid API Key";
        message = "Please check your MailerLite API key in preferences.";
      }

      await showFailureToast(message, { title });
    },
  });

  if (isLoading) {
    return <Detail isLoading />;
  }

  return (
    <List>
      {!isLoading && !campaigns.length && (
        <List.EmptyView
          title="Create your first campaign"
          description="Pick any editor and design a campaign in minutes, then enhance it with advanced features."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.ArrowNe}
                title="Create"
                url="https://dashboard.mailerlite.com/campaigns/status/sent"
              />
            </ActionPanel>
          }
        />
      )}
      {campaigns.map((campaign) => (
        <List.Item
          key={campaign.id}
          title={campaign.name}
          subtitle={`Status: ${campaign.status}, Type: ${campaign.type}`}
          keywords={[`Sent: ${campaign.scheduled_for}`]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<CampaignDetails campaignId={campaign.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const CampaignDetails = ({ campaignId }: { campaignId: string }) => {
  const { mailerliteApiKey } = getPreferenceValues<Preferences>();

  const { isLoading, data: campaign } = useFetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${mailerliteApiKey}`,
      "Content-Type": "application/json",
    },
    mapResult(result: CampaignDetailResponse) {
      return {
        data: result.data,
      };
    },
    async onError(error) {
      let title = "Failed to fetch campaign details";
      let message = `HTTP error! status: ${error.message}`;

      if (error.message.includes("401")) {
        title = "Invalid API Key";
        message = "Please check your MailerLite API key in preferences.";
      }

      await showFailureToast(message, { title });
    },
  });

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (!campaign) {
    return <Detail markdown="No campaign data available." />;
  }

  const stats = campaign.stats;
  const screenshotURL = campaign.emails[0]?.screenshot_url;

  const markdown = `# ${campaign.name}\n${screenshotURL ? `![](${screenshotURL})` : ""}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={campaign.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={campaign.type} />
          <Detail.Metadata.Label title="Sent Date" text={campaign.scheduled_for} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Opens" text={`${stats.opens_count} (${stats.open_rate.string})`} />
          <Detail.Metadata.Label title="Clicks" text={`${stats.clicks_count}`} />
          <Detail.Metadata.Label title="Unique Opens" text={`${stats.unique_opens_count}`} />
          <Detail.Metadata.Label title="Unique Clicks" text={`${stats.unique_clicks_count}`} />
          <Detail.Metadata.Label title="Unsubscribes" text={`${stats.unsubscribes_count}`} />
          <Detail.Metadata.Label title="Spam Reports" text={`${stats.spam_count}`} />
        </Detail.Metadata>
      }
    />
  );
};

export default CampaignList;
