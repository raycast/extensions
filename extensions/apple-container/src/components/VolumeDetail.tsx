import { ActionPanel, Detail } from "@raycast/api";
import { formatTimestamp } from "../lib/format";
import type { VolumeVM } from "../lib/types";
import { VolumeActions } from "./VolumeActions";

export function VolumeDetail({ volume, revalidate }: { volume: VolumeVM; revalidate: () => void }) {
  const created = volume.raw.configuration.creationDate;
  const markdown = [`# ${volume.name}`, volume.source ? `**Source:** \`${volume.source}\`` : ""]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={volume.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={volume.name} />
          <Detail.Metadata.Label title="Driver" text={volume.driver} />
          {volume.format ? <Detail.Metadata.Label title="Format" text={volume.format} /> : null}
          <Detail.Metadata.Label title="Size" text={volume.size} />
          {created ? <Detail.Metadata.Label title="Created" text={formatTimestamp(created)} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <VolumeActions volume={volume} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
