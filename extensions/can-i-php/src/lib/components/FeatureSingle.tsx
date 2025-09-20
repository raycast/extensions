import { Feature } from "../types/feature";
import { Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Resource } from "../types/resource";
import { generateMarkdownTableRow } from "../util/generateMarkdownTableRow";
import { getExternalResources, getPhpResources } from "../util/resources";

function isDeprecated(feature: Feature) {
  if (feature.deprecated === null) {
    return false;
  }
  return true;
}

export const FeatureSingle = ({ feature }: { feature: Feature }) => {
  // Convert <code> tags to markdown inline code
  const description = feature.description
    .replace(/<code>/g, "\n`")
    .replace(/<\/code>/g, "`")
    .replace(/(\n\s{6})/g, "\n");

  const descriptionMarkdown =
    `# ${feature.name}\n\n ## Description \n \n ${description}

  \n\n## Compatibility\n\n
  ` + generateMarkdownTableRow(feature);

  const phpWebsiteResources = getPhpResources(feature.resources);
  const externalResources = getExternalResources(feature.resources);

  return (
    <Detail
      markdown={descriptionMarkdown}
      navigationTitle={feature.name}
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser icon={Icon.List} title="Open caniphp.com" url="https://caniphp.com" />
          <Action.OpenInBrowser icon={Icon.Book} title="Open php.net" url={"https://www.php.net/"} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Deprecated"
            text={isDeprecated(feature) ? { color: Color.Red, value: "Yes" } : "No"}
            icon={isDeprecated(feature) ? { source: Icon.Warning, tintColor: Color.Red } : null}
          />
          <Detail.Metadata.Label
            title="Added in"
            text={feature.added ? (feature.added == "0.0" ? "n/a" : feature.added) : ""}
          />
          <Detail.Metadata.Label title="Removed in" text={feature.removed ?? "-"} />
          {phpWebsiteResources && phpWebsiteResources.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {phpWebsiteResources.map((resource: Resource, index) => (
                <Detail.Metadata.Link
                  key={resource.name + resource.url}
                  title={index === 0 ? "php.net" : ""}
                  text={resource.name}
                  target={resource.url}
                />
              ))}
            </>
          )}
          {externalResources && externalResources.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {externalResources.map((resource: Resource, index) => (
                <Detail.Metadata.Link
                  key={resource.name + resource.url}
                  title={index === 0 ? "Resources" : ""}
                  text={resource.name}
                  target={resource.url}
                />
              ))}
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
};
