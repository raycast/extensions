import { useState, useEffect } from "react";
import { List } from "@raycast/api";

interface LimitedTimeItem {
  name: string;
  description: string;
  detailedDescription?: string;
  steps?: string[];
  deadline: string;
  slack: string;
  slackChannel: string;
  website: string;
}

interface ApiData {
  limitedTime: Record<string, LimitedTimeItem>;
}

export default function Metadata() {
  const [apiData, setApiData] = useState<ApiData | null>(null);

  useEffect(() => {
    const fetchYSWS = async () => {
      try {
        const response = await fetch("https://ysws.hackclub.com/api.json", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ApiData;
        setApiData(data);
      } catch (error) {
        console.error(error);
        setApiData(null);
      }
    };

    fetchYSWS();
  }, []);

  return (
    <List isShowingDetail>
      {apiData == null && <List.EmptyView title="Loading..." />}
      {apiData &&
        Object.entries(apiData.limitedTime).map(([key, value]) => (
          <List.Item
            key={key}
            title={value.name}
            detail={
              <List.Item.Detail
                markdown={`${value.description} \n \n ${value.detailedDescription ? "Detailed Description: " + value.detailedDescription : "Detailed Description Not provided"} \n \n ${value.steps ? "Steps: " + value.steps.join(",") : "No steps provided"}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Deadline"
                      text={new Date(value.deadline).toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Link
                      title="Slack Channel"
                      target={value.slack}
                      text={value.slackChannel}
                    />
                    <List.Item.Detail.Metadata.Link title="Open Website" target={value.website} text={value.website} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
    </List>
  );
}
