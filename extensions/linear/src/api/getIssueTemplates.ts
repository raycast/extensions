import { getLinearClient } from "./linearClient";

export type IssueTemplateResult = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number | null;
  type: string;
  archivedAt?: string | null;
  templateData: unknown;
  team?: { id: string } | null;
};

type TemplateConnection = {
  nodes: IssueTemplateResult[];
};

type IssueTemplatesResponse = {
  organization?: {
    templates?: TemplateConnection;
  };
  team?: {
    templates?: TemplateConnection;
  } | null;
};

const templateFragment = `
  id
  name
  description
  icon
  color
  sortOrder
  type
  archivedAt
  templateData
  team {
    id
  }
`;

function isIssueTemplate(template: IssueTemplateResult, teamId: string) {
  const isIssue = template.type.toLowerCase() === "issue";
  const isAvailableForTeam = !template.team || template.team.id === teamId;

  return isIssue && !template.archivedAt && isAvailableForTeam;
}

function sortIssueTemplates(a: IssueTemplateResult, b: IssueTemplateResult) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
}

export async function getIssueTemplates(teamId?: string) {
  if (!teamId) {
    return [];
  }

  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    IssueTemplatesResponse,
    {
      teamId: string;
      first: number;
    }
  >(
    `
      query IssueTemplates($teamId: String!, $first: Int) {
        organization {
          templates(first: $first) {
            nodes {
              ${templateFragment}
            }
          }
        }
        team(id: $teamId) {
          templates(first: $first) {
            nodes {
              ${templateFragment}
            }
          }
        }
      }
    `,
    { teamId, first: 100 },
  );

  const templates = [...(data?.organization?.templates?.nodes ?? []), ...(data?.team?.templates?.nodes ?? [])].filter(
    (template, index, array) => array.findIndex((item) => item.id === template.id) === index,
  );

  return templates.filter((template) => isIssueTemplate(template, teamId)).sort(sortIssueTemplates);
}
