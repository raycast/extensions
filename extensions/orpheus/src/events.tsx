import { useState, useEffect } from "react";
import { List } from "@raycast/api";

interface ApiData {
  id: string;
  title: string;
  desc: string;
  leader: string;
  start: string;
  end: string;
  slug: string;
  cal: string;
}

export default function Metadata() {
  const [apiData, setApiData] = useState<ApiData[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("https://events.hackclub.com/api/events/upcoming/", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as ApiData[];
        setApiData(data);
      } catch (error) {
        console.error(error);
        setApiData([]);
      }
    };

    fetchEvents();
  }, []);

  return (
    <List isShowingDetail>
      {apiData.length === 0 && <List.EmptyView title="Loading..." />}
      {apiData.map((event: ApiData) => (
        <List.Item
          key={event.id}
          title={event.title}
          detail={
            <List.Item.Detail
              markdown={`${event.desc}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Host" text={event.leader} />
                  <List.Item.Detail.Metadata.Label title="Start Time" text={new Date(event.start).toLocaleString()} />
                  <List.Item.Detail.Metadata.Label title="End Time" text={new Date(event.end).toLocaleString()} />
                  <List.Item.Detail.Metadata.Link title="Calendar" text="Add to your calendar" target={event.cal} />
                  <List.Item.Detail.Metadata.Link
                    title="Portal"
                    text="Open on Hack Club Events"
                    target={`https://events.hackclub.com/${event.slug}`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
