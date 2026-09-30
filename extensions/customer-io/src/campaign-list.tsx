import { useState, useEffect, useMemo } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { getCampaigns, pauseCampaign, resumeCampaign, Campaign } from "./api";
import CampaignDetail from "./campaign-detail";
import { formatRelativeTime } from "./utils/format-date";
import { getStateColor } from "./utils/colors";
import { formatState, formatTypeName } from "./utils/formatters";

function getTypeIcon(type?: string): Icon {
  switch (type) {
    case "segment":
      return Icon.Person;
    case "seg_attr":
      return Icon.PersonLines;
    case "behavioral":
      return Icon.LightBulb;
    case "date":
      return Icon.Calendar;
    case "api":
    case "event":
      return Icon.Code;
    default:
      return Icon.Envelope;
  }
}

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch((error) => {
        showToast({ title: "Error loading campaigns", message: error.message, style: Toast.Style.Failure });
        setCampaigns([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const uniqueTypes = useMemo(() => {
    const types = Array.from(new Set(campaigns.map((c) => c.type).filter(Boolean) as string[])).sort();
    return types;
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const filtered =
      selectedType === "all" ? campaigns : campaigns.filter((campaign) => campaign.type === selectedType);
    return filtered.sort((a, b) => b.created - a.created);
  }, [campaigns, selectedType]);

  return (
    <List
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" value={selectedType} onChange={setSelectedType}>
          <List.Dropdown.Item title="All Types" value="all" />
          {uniqueTypes.map((type) => (
            <List.Dropdown.Item key={type} title={formatTypeName(type)} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredCampaigns.map((campaign) => (
        <List.Item
          key={campaign.id}
          icon={{ source: getTypeIcon(campaign.type), tintColor: Color.Blue }}
          title={campaign.name}
          subtitle={formatTypeName(campaign.type)}
          accessories={[
            { tag: { value: formatState(campaign.state), color: getStateColor(campaign.state) } },
            ...(campaign.tags && campaign.tags.length > 0 ? [{ text: campaign.tags.slice(0, 2).join(", ") }] : []),
            { text: formatRelativeTime(campaign.created) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Open Details" target={<CampaignDetail id={campaign.id} />} />
              <Action
                title="Pause Campaign"
                icon={Icon.Pause}
                onAction={async () => {
                  try {
                    await pauseCampaign(campaign.id);
                    await showToast({ title: "Campaign paused", style: Toast.Style.Success });
                    const updated = await getCampaigns();
                    setCampaigns(updated);
                  } catch (error) {
                    await showToast({
                      title: "Failed to pause",
                      message: (error as Error).message,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
              <Action
                title="Resume Campaign"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    await resumeCampaign(campaign.id);
                    await showToast({ title: "Campaign resumed", style: Toast.Style.Success });
                    const updated = await getCampaigns();
                    setCampaigns(updated);
                  } catch (error) {
                    await showToast({
                      title: "Failed to resume",
                      message: (error as Error).message,
                      style: Toast.Style.Failure,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
