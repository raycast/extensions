import { Detail } from "@raycast/api";
import { Metadata } from "../types";

interface MetadataSectionProps {
  url: string;
  metadata: Metadata;
}

export function MetadataSection({ url, metadata }: MetadataSectionProps) {
  const metadataItems = [
    { label: "Source URL", text: url },
    {
      label: "Word Count",
      text: metadata.wordCount?.toLocaleString() || "Calculating...",
    },
    { label: "Reading Time", text: metadata.readingTime || "Calculating..." },
  ];

  return (
    <Detail.Metadata>
      {metadataItems.map((item) => (
        <Detail.Metadata.Label key={item.label} title={item.label} text={item.text} />
      ))}
    </Detail.Metadata>
  );
}
