import { Action, ActionPanel, Detail, List, Toast, getPreferenceValues, showToast } from '@raycast/api';
import { useFetch } from '@raycast/utils';

const API_BASE_URL = 'https://connect.mailerlite.com/api';

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
  const { mailerliteApiKey } = getPreferenceValues();
  const { data: campaignListData, isLoading, error } = useFetch<CampaignListResponse>(`${API_BASE_URL}/campaigns?filter[status]=sent`, {
    headers: {
      'Authorization': `Bearer ${mailerliteApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (isLoading) {
    return <List isLoading />;
  }

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch campaigns", error.message);
    return <List.EmptyView title={`Failed to load campaigns: ${error.message}`} />;
  }

  const campaigns = campaignListData?.data || [];

  return (
    <List>
      {campaigns.map((campaign) => (
        <List.Item
          key={campaign.id}
          title={campaign.name}
          subtitle={`Status: ${campaign.status}, Type: ${campaign.type}`}
          keywords={[`Sent: ${campaign.scheduled_for}`]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                target={<CampaignDetails campaignId={campaign.id} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const CampaignDetails = ({ campaignId }: { campaignId: string }) => {
  const { mailerliteApiKey } = getPreferenceValues();
  const { data: campaignData, isLoading, error } = useFetch<CampaignDetailResponse>(`${API_BASE_URL}/campaigns/${campaignId}`, {
    headers: {
      'Authorization': `Bearer ${mailerliteApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (error) {
    return <Detail markdown="Failed to load campaign details." />;
  }

  if (!campaignData) {
    return <Detail markdown="No campaign data available." />;
  }

  const campaign = campaignData.data;
  const stats = campaign.stats;
  const screenshotURL = campaign.emails[0]?.screenshot_url;

  const markdown = `# ${campaign.name}\n${screenshotURL ? `![](${screenshotURL})` : ''}`;

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
