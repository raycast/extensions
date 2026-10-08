import { ActionPanel, Detail } from "@raycast/api";
import { formatTimestamp, trimDigest } from "../lib/format";
import type { ImageVM } from "../lib/types";
import { ImageActions } from "./ImageActions";

function imageMarkdown(image: ImageVM): string {
  const config = image.raw.variants?.[0]?.config?.config;
  const sections = [`# ${image.nameShort}`, `**Reference:** \`${image.name}\``];
  if (config?.Entrypoint?.length) {
    sections.push(`**Entrypoint:** \`${config.Entrypoint.join(" ")}\``);
  }
  if (config?.Cmd?.length) {
    sections.push(`**Command:** \`${config.Cmd.join(" ")}\``);
  }
  if (config?.WorkingDir) {
    sections.push(`**Working Dir:** \`${config.WorkingDir}\``);
  }
  if (config?.Env?.length) {
    sections.push(`## Environment\n\n\`\`\`\n${config.Env.join("\n")}\n\`\`\``);
  }
  return sections.join("\n\n");
}

export function ImageDetail({ image, revalidate }: { image: ImageVM; revalidate: () => void }) {
  const created = image.raw.configuration.creationDate;
  return (
    <Detail
      navigationTitle={image.nameShort}
      markdown={imageMarkdown(image)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Reference" text={image.name} />
          <Detail.Metadata.Label title="ID" text={trimDigest(image.id)} />
          <Detail.Metadata.Label title="Digest" text={trimDigest(image.digest)} />
          <Detail.Metadata.Label title="Size" text={image.size} />
          {image.architectures.length > 0 ? (
            <Detail.Metadata.TagList title="Architectures">
              {image.architectures.map((arch) => (
                <Detail.Metadata.TagList.Item key={arch} text={arch} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {created ? <Detail.Metadata.Label title="Created" text={formatTimestamp(created)} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ImageActions image={image} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
