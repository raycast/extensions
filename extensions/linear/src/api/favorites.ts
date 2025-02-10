import {
  CustomView,
  Cycle,
  Document,
  Issue,
  IssueLabel,
  Project,
  Roadmap,
  Team,
  User,
  WorkflowState,
} from "@linear/sdk";
import { getLinearClient } from "../api/linearClient";

export type Favorite = {
  id: string;
  // Type is defined as a string in Linear's SDK so let's narrow down the type from this page:
  // https://linear.app/docs/favorites
  type: "customView" | "cycle" | "document" | "issue" | "label" | "project" | "roadmap" | "user";
  customView?: Pick<CustomView, "id" | "name" | "icon" | "color">;
  cycle?: Pick<Cycle, "id" | "number" | "startsAt" | "endsAt" | "completedAt"> & {
    team: Pick<Team, "key">;
  };
  document?: Pick<Document, "id" | "color" | "title" | "slugId">;
  issue?: Pick<Issue, "id" | "title" | "url"> & {
    state: Pick<WorkflowState, "id" | "type" | "name" | "color">;
  };
  label?: Pick<IssueLabel, "id" | "name" | "color"> & {
    team: Pick<Team, "key">;
  };
  project?: Pick<Project, "id" | "name" | "icon" | "color" | "url">;
  roadmap?: Pick<Roadmap, "id" | "color" | "name">;
  user?: Pick<User, "id" | "displayName" | "name" | "avatarUrl" | "url">;
  updatedAt: string;
};

export async function getFavorites() {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { viewer: { organization: { urlKey: string } }; favorites: { nodes: Favorite[] } },
    Record<string, unknown>
  >(
    `
      query {
        viewer {
          organization {
            urlKey
          }
        }
        favorites {
          nodes {
            id
            type
            customView {
              id
              color
              icon
              name
            }
            cycle {
              id
              number
              startsAt
              endsAt
              completedAt
              team {
                key
              }
            }
            document {
              id
              color
              slugId
              title
            }
            issue {
              id
              state {
                id
                type
                name
                color
              }
              title
              url
            }
            label {
              id
              color
              name
              team {
                key
              }
            }
            project {
              id
              color
              icon
              name
              url
            }
            roadmap {
              id
              color
              name
            }
            user {
              id
              avatarUrl
              displayName
              name
              url
            }
            updatedAt
          }
        }
      }
    `,
  );

  return { organization: data?.viewer.organization, favorites: data?.favorites.nodes };
}
