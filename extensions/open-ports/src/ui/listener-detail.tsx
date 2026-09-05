import { Color, Icon, List } from "@raycast/api";
import { escapeInline, fencedCodeBlock } from "../core/markdown";
import { wellKnownPort } from "../core/ports";
import { Listener, ProcessDetails } from "../core/types";
import { exposureMeta } from "./presentation";

const IP_COLORS: Record<string, Color> = { IPv4: Color.Blue, IPv6: Color.Purple };

export function ListenerDetail({ listener, details }: { listener: Listener; details?: ProcessDetails }) {
  const exposure = exposureMeta(listener.exposure);
  const service = wellKnownPort(listener.port);

  return (
    <List.Item.Detail
      markdown={buildMarkdown(listener, details)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Port" text={String(listener.port)} icon={Icon.Hashtag} />
          {service ? <List.Item.Detail.Metadata.Label title="Commonly Used By" text={service} /> : null}
          <List.Item.Detail.Metadata.Label title="Process" text={listener.command} icon={Icon.AppWindow} />
          <List.Item.Detail.Metadata.Label title="PID" text={String(listener.pid)} icon={Icon.Fingerprint} />
          {details ? <List.Item.Detail.Metadata.Label title="Parent PID" text={String(details.ppid)} /> : null}
          <List.Item.Detail.Metadata.Label title="User" text={listener.user} icon={Icon.Person} />
          {details ? (
            <List.Item.Detail.Metadata.Label title="Started" text={details.started} icon={Icon.Clock} />
          ) : null}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.TagList title="Protocol">
            <List.Item.Detail.Metadata.TagList.Item text="TCP" color={Color.SecondaryText} />
            <List.Item.Detail.Metadata.TagList.Item text="LISTEN" color={Color.Green} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="IP Version">
            {listener.ipVersions.map((version) => (
              <List.Item.Detail.Metadata.TagList.Item key={version} text={version} color={IP_COLORS[version]} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Exposure">
            <List.Item.Detail.Metadata.TagList.Item text={exposure.description} color={exposure.color} />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          {listener.bindings.map((binding) => (
            <List.Item.Detail.Metadata.Label
              key={`${binding.fd}-${binding.address}`}
              title={`${binding.ipVersion} · fd ${binding.fd}`}
              text={binding.address}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Process names, command lines and lsof rows all originate outside this extension, so every
 * interpolation is either escaped or fenced.
 */
function buildMarkdown(listener: Listener, details?: ProcessDetails): string {
  const service = wellKnownPort(listener.port);
  const addresses = listener.bindings.map((binding) => `\`${binding.address.replaceAll("`", "")}\``).join(", ");

  const sections = [
    `## Port ${listener.port}${service ? ` · ${service}` : ""}`,
    "",
    `**${escapeInline(listener.command)}** (PID ${listener.pid}) is listening on ${addresses}.`,
    "",
  ];

  if (details?.commandLine) {
    sections.push("**Command line**", "", fencedCodeBlock(details.commandLine), "");
  }

  sections.push("**lsof**", "", fencedCodeBlock(listener.bindings.map((binding) => binding.raw).join("\n")));

  return sections.join("\n");
}
