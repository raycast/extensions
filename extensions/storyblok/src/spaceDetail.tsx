import { ActionPanel, Action, Detail } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { collaborator, environment, feature, space } from "./utils/types";

function featureLimitsTable(data: feature[]): string {
  let markdownTable = "## Features \n | Key | Limit | Is Available |\n";
  markdownTable += "|---|---|---|\n";

  data.forEach((item) => {
    const key = item.key.replace(/_/g, " ") || "";
    const limit = item.limit || "";
    const isAvailable = item.is_available || "";

    markdownTable += `| ${key} | ${limit} | ${isAvailable} |\n`;
  });

  return markdownTable;
}

function collaboratorsTable(data: collaborator[]): string {
  let markdownTable = `## Collaborators (${data.length}) \n | Name | Email | Role |\n`;
  markdownTable += "|---|---|---|\n";

  data.forEach((item) => {
    if (item.user) {
      const name = item.user.friendly_name ? item.user.friendly_name : "";
      const email = item.user.alt_email ?? item.user.userid;
      const role = item.role || "";

      markdownTable += `| ${name} | ${email} | ${role} |\n`;
    }
  });
  if (data.length > 0) {
    return markdownTable;
  } else return "";
}

function environmentsTable(data: environment[]): string {
  if (data != null && data.length > 0) {
    let markdownTable = `## Environments \n | Name | Domain |\n`;
    markdownTable += "|---|---|\n";

    data.forEach((item) => {
      const name = item.name || "";
      const domain = item.location || "";

      markdownTable += `| ${name} | ${domain} |\n`;
    });

    return markdownTable;
  } else return "";
}

interface spaceData {
  space: space;
}

export default function SpaceDetail(props: { spaceId: number }) {
  const data = sbData<spaceData>(`spaces/${props.spaceId}`);
  if (data.isLoading) {
    return <Detail isLoading={data.isLoading} markdown={`Loading...`} />;
  }

  if (!data.data) {
    return <Detail markdown="No details found" />;
  }

  const space = data.data.space;
  const content = `# ${space.name} \n ${environmentsTable(space.environments)} \n ${collaboratorsTable(space.collaborators)} \n ${featureLimitsTable(space.feature_limits)}`;
  return (
    <Detail
      isLoading={data.isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy Space ID: ${space.id}`} content={space.id} />
          <Action.CopyToClipboard title={`Copy Preview Token: ${space.first_token}`} content={space.first_token} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Domain" target={space.domain} text={space.domain} />
          {space.org && <Detail.Metadata.Label title="Organization" text={space.org.name} />}
          <Detail.Metadata.Label title="Your Role" text={space.role} />
          <Detail.Metadata.Label title="Collaborators" text={space.collaborators.length.toString()} />
          <Detail.Metadata.Label title="Total Stories" text={space.stories_count.toString()} />
          <Detail.Metadata.Label title="Total Assets" text={space.assets_count.toString()} />
          <Detail.Metadata.Label title="API Requests Today" text={space.request_count_today.toString()} />
          <Detail.Metadata.Link
            title={`Email Space Owner`}
            target={`mailto:${space.owner.real_email}`}
            text={space.owner.friendly_name ?? "Owner's email"}
          />
        </Detail.Metadata>
      }
    />
  );
}
