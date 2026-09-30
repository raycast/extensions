import { useEffect, useState } from "react";
import { ActionPanel, Action, Detail, List, Color } from "@raycast/api";
import { VODModel, SingleVod } from "./interface/vodModel";

import fetch from "node-fetch";

export default function Command() {
  const [vods, setVods] = useState<SingleVod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVods = async () => {
    setIsLoading(true);
    const response = await fetch("https://api.xqc.wtf/vods?$limit=20&$sort[createdAt]=-1");
    const data = (await response.json()) as VODModel;
    setVods(data.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVods();
  }, []);

  return (
    <List enableFiltering={false} navigationTitle="Search Vods" isLoading={isLoading}>
      {vods.map((vod) => (
        <List.Item
          key={vod.id}
          id={vod.id}
          icon={vod.thumbnail_url}
          title={vod.title}
          subtitle={vod.date}
          actions={
            <ActionPanel>
              <Action.Push title="Details" target={<VodDetail vod={vod} />} />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}

function VodDetail(props: { vod: SingleVod }) {
  return (
    <Detail
      key={props.vod.id}
      markdown={`
      ${props.vod.youtube
        .map(
          (youtube) => `
![](${youtube.thumbnail_url})

        Part ${youtube.part}
        Duration: ${Math.round(youtube.duration / 60 / 60)} hours
        Link: https://www.youtube.com/watch?v=${youtube.id}

        `
        )
        .join("\n")}
      `}
      navigationTitle={props.vod.title}
      metadata={
        <Detail.Metadata>
          {props.vod.youtube.map((youtube) => (
            <Detail.Metadata.Link
              title={`Youtube Link: ${Math.round(youtube.duration / 60 / 60)} hours`}
              target={`https://www.youtube.com/watch?v=${youtube.id}`}
              text={`Part ${youtube.part}`}
              key={youtube.id}
            />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
