import { IssueLabel } from "@linear/sdk";
import { getPreferenceValues } from "@raycast/api";

import { getLinearClient } from "../api/linearClient";

import { getPaginated, PageInfo } from "./pagination";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_LABELS_LIMIT = 100;

const preferences = getPreferenceValues<Preferences>();

function getPageLimits() {
  const parsed = Number(preferences.labelsLimit);
  const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LABELS_LIMIT;
  const pageSize = Math.floor(Math.min(DEFAULT_PAGE_SIZE, limit));
  const pageLimit = Math.ceil(limit / pageSize);
  return { pageSize, pageLimit };
}

export type LabelResult = Pick<IssueLabel, "id" | "name" | "color">;

export async function getLabels(teamId?: string) {
  if (!teamId) {
    return [];
  }

  const { pageSize, pageLimit } = getPageLimits();

  const { graphQLClient } = getLinearClient();

  return getPaginated(
    async (cursor) =>
      graphQLClient.rawRequest<
        { team: { labels: { nodes: LabelResult[]; pageInfo: PageInfo } } },
        { teamId: string; cursor?: string }
      >(
        `
          query($teamId: String!, $cursor: String) {
            team(id: $teamId) {
              labels(first: ${pageSize}, after: $cursor) {
                nodes {
                  id
                  name
                  color
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `,
        { teamId, cursor },
      ),
    (response) => response.data?.team?.labels?.pageInfo,
    (accumulator: LabelResult[], response) => accumulator.concat(response.data?.team?.labels?.nodes ?? []),
    [],
    pageLimit,
  );
}
