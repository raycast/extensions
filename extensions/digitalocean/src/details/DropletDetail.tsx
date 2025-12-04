import { Droplet } from "../client";
import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useMemo } from "react";

export default function DropletDetail({ droplet }: { droplet: Droplet }) {
  const ip = useMemo(
    () => ({
      v4: {
        public: droplet.networks.v4?.filter((ip) => ip.type === "public") ?? [],
        private: droplet.networks.v4?.filter((ip) => ip.type === "private") ?? [],
      },
      v6: {
        public: droplet.networks.v6?.filter((ip) => ip.type === "public") ?? [],
      },
    }),
    [droplet],
  );

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://cloud.digitalocean.com/droplets/${droplet.id}`} />
        </ActionPanel>
      }
      markdown={`\
# ${droplet.name}

### Public IP Addresses

${ip.v4.public.map((ip) => `\`\`\`${ip.ip_address}\`\`\``).join("\n") + "\n"}\
${ip.v6.public.map((ip) => `\`\`\`${ip.ip_address}\`\`\``).join("\n") + "\n"}\
${ip.v4.public.length + ip.v6.public.length === 0 ? "\nNone\n" : ""}\

### Private IP Addresses

${ip.v4.private.map((ip) => `\`\`\`${ip.ip_address}\`\`\``).join("\n")}
${ip.v4.private.length === 0 ? "\nNone\n" : ""}\
`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Memory" text={`${droplet.memory}mb`} />
          <Detail.Metadata.Label title="Compute" text={`${droplet.vcpus}vcpu${droplet.vcpus > 1 ? "s" : ""}`} />
          <Detail.Metadata.Label title="Disk" text={`${droplet.disk}gb`} />
          {droplet.features.length === 0 ? null : (
            <Detail.Metadata.TagList title="Features">
              {droplet.features.map((feature) => (
                <Detail.Metadata.TagList.Item key={feature} text={feature} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Label title="Locked" text={String(droplet.locked)} />
          <Detail.Metadata.Label title="Region" text={droplet.region.slug} />
          <Detail.Metadata.Label
            title="Status"
            icon={
              droplet.status === "new"
                ? { source: Icon.CircleProgress50, tintColor: Color.Yellow }
                : droplet.status === "active"
                ? { source: Icon.Check, tintColor: Color.Green }
                : { source: Icon.Xmark, tintColor: Color.Red }
            }
            text={String(droplet.status)}
          />
          {droplet.tags.length === 0 ? null : (
            <Detail.Metadata.TagList title="Tags">
              {droplet.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
