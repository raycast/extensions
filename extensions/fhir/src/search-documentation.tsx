import { ActionPanel, Action, List, environment, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFileSync } from "fs";
import { join } from "path";

interface FHIRResource {
  id: string;
  resourceType: string;
  name?: string;
  url?: string;
  status?: "draft" | "active" | "retired" | "unknown";
  experimental?: boolean;
  description?: string;
  version?: string;
  publisher?: string;
  jurisdiction?: unknown[];
  extension?: unknown[];
}

export default function Command() {
  const { data: resources, isLoading } = useCachedPromise(
    async () => {
      const filePath = join(environment.assetsPath, "hl7.fhir.r5.core.resources.json");
      const fileContent = readFileSync(filePath, "utf-8");
      const rawResources = JSON.parse(fileContent) as Partial<FHIRResource>[];

      return rawResources.map(
        (resource): FHIRResource => ({
          id: resource.id || "",
          resourceType: resource.resourceType || "",
          name: resource.name,
          url: resource.url,
          status: resource.status,
          experimental: resource.experimental,
          description: resource.description,
          version: resource.version,
          publisher: resource.publisher,
          jurisdiction: resource.jurisdiction,
          extension: resource.extension,
        }),
      );
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  // Group resources by type
  const groupedResources =
    resources?.reduce(
      (groups, resource) => {
        const type = resource.resourceType;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(resource);
        return groups;
      },
      {} as Record<string, FHIRResource[]>,
    ) || {};

  const sortedResourceTypes = Object.keys(groupedResources).sort();

  return (
    <List isLoading={isLoading} isShowingDetail={true} searchBarPlaceholder="Search FHIR documentation...">
      {sortedResourceTypes.map((resourceType) => (
        <List.Section
          key={resourceType}
          title={resourceType}
          subtitle={groupedResources[resourceType].length.toString()}
        >
          {groupedResources[resourceType].map((resource) => (
            <FHIRResourceListItem key={resource.id} resource={resource} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function FHIRResourceListItem({ resource }: { resource: FHIRResource }) {
  const title = resource.name || resource.id;
  const keywords = [
    resource.id,
    resource.resourceType,
    resource.description,
    resource.publisher,
    resource.status,
  ].filter((keyword): keyword is string => Boolean(keyword));

  const descriptionMarkdown = resource.description ? `### ${resource.name}\n\n${resource.description}` : "";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return Color.Green;
      case "draft":
        return Color.Orange;
      case "retired":
        return Color.SecondaryText;
      case "unknown":
        return Color.Yellow;
      default:
        return undefined;
    }
  };

  return (
    <List.Item
      title={title}
      keywords={keywords}
      detail={
        <List.Item.Detail
          markdown={descriptionMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Resource Type">
                <List.Item.Detail.Metadata.TagList.Item text={resource.resourceType} />
              </List.Item.Detail.Metadata.TagList>

              <List.Item.Detail.Metadata.TagList title="ID">
                <List.Item.Detail.Metadata.TagList.Item text={resource.id} />
              </List.Item.Detail.Metadata.TagList>

              {resource.status && (
                <List.Item.Detail.Metadata.TagList title="Status">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={resource.status}
                    color={getStatusColor(resource.status)}
                  />
                  {resource.experimental && (
                    <List.Item.Detail.Metadata.TagList.Item text="experimental" color={Color.Red} />
                  )}
                </List.Item.Detail.Metadata.TagList>
              )}

              <List.Item.Detail.Metadata.Separator />

              {resource.url && <List.Item.Detail.Metadata.Link title="URL" target={resource.url} text={resource.url} />}
              {resource.version && <List.Item.Detail.Metadata.Label title="Version" text={resource.version} />}
              {resource.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={resource.publisher} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {resource.url && <Action.OpenInBrowser title="Open in Browser" url={resource.url} />}
            <Action.CopyToClipboard
              title="Copy Resource ID"
              content={resource.id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            {resource.url && (
              <Action.CopyToClipboard
                title="Copy URL"
                content={resource.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
