import { ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useContainerInspect } from "../hooks/useContainers";
import { stateColor } from "../lib/constants";
import { formatTimestamp, relativeDate } from "../lib/format";
import { toContainerVM, type ContainerVM } from "../lib/types";
import { ContainerActions } from "./ContainerActions";
import { ErrorView } from "./ErrorView";

function detailMarkdown(container: ContainerVM): string {
  const init = container.raw.configuration.initProcess;
  const command = init?.executable ? [init.executable, ...(init.arguments ?? [])].join(" ") : undefined;
  const env = init?.environment ?? [];

  const sections = [`# ${container.id}`, `**Image:** \`${container.image}\``];
  if (command) {
    sections.push(`**Command:** \`${command}\``);
  }
  if (env.length > 0) {
    sections.push(`## Environment\n\n\`\`\`\n${env.join("\n")}\n\`\`\``);
  }
  return sections.join("\n\n");
}

export function ContainerDetail({ id }: { id: string }) {
  const { data, isLoading, error, revalidate } = useContainerInspect(id);
  const { pop } = useNavigation();

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const raw = data?.[0];
  const container = raw ? toContainerVM(raw) : undefined;
  const labels = container ? Object.entries(container.raw.configuration.labels ?? {}) : [];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={container ? container.id : id}
      markdown={container ? detailMarkdown(container) : ""}
      metadata={
        container ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="State">
              <Detail.Metadata.TagList.Item text={container.state} color={stateColor(container.state)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Image" text={container.imageShort} />
            {container.ip ? <Detail.Metadata.Label title="IP Address" text={container.ip} /> : null}
            <Detail.Metadata.Label title="Platform" text={`${container.os}/${container.arch}`} />
            <Detail.Metadata.Label title="CPUs" text={String(container.cpus)} />
            <Detail.Metadata.Label title="Memory" text={container.memory} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Started"
              text={container.startedAt ? relativeDate(container.startedAt) : "—"}
            />
            {container.raw.configuration.creationDate ? (
              <Detail.Metadata.Label title="Created" text={formatTimestamp(container.raw.configuration.creationDate)} />
            ) : null}
            {labels.length > 0 ? <Detail.Metadata.Separator /> : null}
            {labels.map(([key, value]) => (
              <Detail.Metadata.Label key={key} title={key} text={value} />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        container ? (
          <ActionPanel>
            <ContainerActions container={container} revalidate={revalidate} onRemoved={pop} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
