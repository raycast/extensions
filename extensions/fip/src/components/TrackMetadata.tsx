import { useEffect, useState } from "react";
import { fetchMetadata, TrackMetadata } from "../utils/utils";
import { Action, ActionPanel, Detail, showHUD } from "@raycast/api";

export type TrackObject = {
  metadataKey: "now" | "prev" | "next";
};

export default function TrackMetadata({ metadataKey }: TrackObject) {
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetchMetadata().then((d) => {
      if (!d) {
        showHUD("❌ could not load FIP metadata");
      } else {
        if (["prev", "next"].includes(metadataKey)) {
          const m = d[metadataKey] as TrackMetadata[];
          setMetadata(m[0]);
        } else {
          const m = d[metadataKey] as TrackMetadata;
          setMetadata(m);
        }
      }
      setLoading(false);
    });
    fetchMetadata();
  }, []);
  if (loading || !metadata) {
    return <Detail isLoading={loading} />;
  }

  const markdown = `
<img alt="cover" height="350" src="${metadata.cover}">
    `;
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://fip.fr" />
          <Action.CopyToClipboard title="Copy Track Name" content={`${metadata.firstLine} ${metadata.secondLine}`} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={metadata.firstLine} />
          <Detail.Metadata.Label title="Artist" text={metadata.secondLine} />
        </Detail.Metadata>
      }
      isLoading={loading}
      markdown={markdown}
    />
  );
}
