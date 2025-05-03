import { useEffect, useState } from "react";
import { fetchMetadata, getRadioById, TrackMetadata } from "../utils/utils";
import { Action, ActionPanel, Detail, LocalStorage, showHUD } from "@raycast/api";

export type TrackObject = {
  metadataKey: "now" | "prev" | "next";
};

export default function TrackMetadata({ metadataKey }: TrackObject) {
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [radioTitle, setRadioTitle] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const radioId = (await LocalStorage.getItem<string>("currently-playing-radio")) || "7";
      const _radioTitle = getRadioById(radioId);
      setRadioTitle(_radioTitle?.title);
      const rootObject = await fetchMetadata(radioId);
      if (!rootObject) {
        showHUD("❌ could not load FIP metadata");
      } else {
        if (["prev", "next"].includes(metadataKey)) {
          const m = rootObject[metadataKey] as TrackMetadata[];
          setMetadata(m[0]);
        } else {
          const m = rootObject[metadataKey] as TrackMetadata;
          setMetadata(m);
        }
      }
      setLoading(false);
    })();
    setLoading(true);
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
          <Detail.Metadata.Label title="Radio" text={radioTitle} />
          <Detail.Metadata.Label title="Title" text={metadata.firstLine} />
          <Detail.Metadata.Label title="Artist" text={metadata.secondLine} />
        </Detail.Metadata>
      }
      isLoading={loading}
      markdown={markdown}
    />
  );
}
