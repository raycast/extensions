import { Action, ActionPanel, Detail, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

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
  const { mailerliteApiKey } = getPreferenceValues();
  const [campaignListData, setCampaignListData] = useState<CampaignListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/campaigns?filter[status]=sent`, {
          headers: {
            Authorization: `Bearer ${mailerliteApiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        const data: CampaignListResponse = jsonData as CampaignListResponse;
        setCampaignListData(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [mailerliteApiKey]);

  useEffect(() => {
    if (error) {
      let title = "Failed to fetch campaigns";
      let message = error.message;

      if (error.message.includes("401")) {
        title = "Invalid API Key";
        message = "Please check your MailerLite API key in preferences.";
      }

      showToast(Toast.Style.Failure, title, message);
    }
  }, [error]);

  if (isLoading) {
    return <Detail isLoading />;
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
              <Action.Push title="View Details" target={<CampaignDetails campaignId={campaign.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const CampaignDetails = ({ campaignId }: { campaignId: string }) => {
  const { mailerliteApiKey } = getPreferenceValues();
  const [campaignData, setCampaignData] = useState<CampaignDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
          headers: {
            Authorization: `Bearer ${mailerliteApiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = (await response.json()) as CampaignDetailResponse;
        setCampaignData(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [campaignId, mailerliteApiKey]);

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (!campaignData) {
    return <Detail markdown="No campaign data available." />;
  }

  const campaign = campaignData.data;
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
