import { Action, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DokployClient } from "../api/client";
import { getService, listDomains } from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";
import { serviceKindConfig } from "../lib/service-kinds";
import { statusTag } from "../lib/status";
import { serviceUrl } from "../lib/urls";
import { Application, Compose, Domain, ServiceRef, ServiceStatus } from "../types/dokploy";
import { ServiceActions } from "./service-actions";

interface ServiceDetailProps {
  client: DokployClient;
  service: ServiceRef;
  onDidChange: () => void;
}

/** Where the service's source comes from, summarised for the metadata panel. */
function describeSource(detail: Application & Compose): string | undefined {
  if (detail.dockerImage) return detail.dockerImage;
  if (detail.repository) {
    const repo = detail.owner ? `${detail.owner}/${detail.repository}` : detail.repository;
    return detail.branch ? `${repo} @ ${detail.branch}` : repo;
  }
  return detail.sourceType ?? undefined;
}

export function ServiceDetail({ client, service, onDidChange }: ServiceDetailProps) {
  const config = serviceKindConfig(service.kind);

  const {
    data,
    isLoading,
    revalidate,
    error: detailError,
  } = usePromise(
    async (ref: ServiceRef) => {
      // Domains only exist for applications and compose stacks; the helper returns [] otherwise.
      const [detail, domains] = await Promise.all([getService(client, ref.kind, ref.id), listDomains(client, ref)]);
      return { detail: detail as Application & Compose, domains };
    },
    [service],
  );

  const detail = data?.detail;
  const domains: Domain[] = data?.domains ?? [];

  // `project.all` withholds appName and status from non-admin users; the detail route has them.
  const enrichedService: ServiceRef = {
    ...service,
    appName: detail?.appName ?? service.appName,
    status: ((detail?.applicationStatus ?? detail?.composeStatus) as ServiceStatus | undefined) ?? service.status,
  };

  const status = statusTag(enrichedService.status);
  const source = detail ? describeSource(detail) : undefined;

  const markdown = detailError
    ? `## ${service.name}\n\n> Could not load details: ${toErrorMessage(detailError)}`
    : [
        `## ${service.name}`,
        service.description ? `\n${service.description}` : "",
        domains.length > 0
          ? `\n### Domains\n${domains
              .map((domain) => `- [${domain.host}](${domain.https ? "https" : "http"}://${domain.host})`)
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={service.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.value} color={status.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Type"
            text={config.label}
            icon={{ source: config.icon, tintColor: config.color }}
          />
          <Detail.Metadata.Label title="Project" text={service.projectName} />
          <Detail.Metadata.Label title="Environment" text={service.environmentName} />
          {enrichedService.appName && <Detail.Metadata.Label title="Container" text={enrichedService.appName} />}
          {source && <Detail.Metadata.Label title="Source" text={source} />}
          {detail?.buildType && <Detail.Metadata.Label title="Build" text={detail.buildType} />}
          {typeof detail?.replicas === "number" && (
            <Detail.Metadata.Label title="Replicas" text={String(detail.replicas)} />
          )}
          {detail?.autoDeploy !== undefined && detail?.autoDeploy !== null && (
            <Detail.Metadata.TagList title="Auto Deploy">
              <Detail.Metadata.TagList.Item
                text={detail.autoDeploy ? "Enabled" : "Disabled"}
                color={detail.autoDeploy ? Color.Green : Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Dashboard" target={serviceUrl(client.webUrl, service)} text="Open in Dokploy" />
        </Detail.Metadata>
      }
      actions={
        <ServiceActions
          client={client}
          service={enrichedService}
          primaryAction={
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => {
                revalidate();
                onDidChange();
              }}
            />
          }
          onDidChange={() => {
            revalidate();
            onDidChange();
          }}
        />
      }
    />
  );
}
