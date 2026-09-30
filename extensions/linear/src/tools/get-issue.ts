import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { serializeIssue } from "./issueUtils";
import { resolveIssue } from "./linearUtils";

type Input = {
  id: string;
  includeRelations?: boolean;
  includeCustomerNeeds?: boolean;
  includeReleases?: boolean;
};

export default withAccessToken(linear)(async (input: Input) => {
  const issue = await resolveIssue(input.id);
  return {
    ...(await serializeIssue(issue)),
    identifier: issue.identifier,
    branchName: issue.branchName,
    attachments: (await issue.attachments({ first: 250 })).nodes,
    relations: input.includeRelations
      ? {
          outgoing: (await issue.relations({ first: 250 })).nodes,
          incoming: (await issue.inverseRelations({ first: 250 })).nodes,
        }
      : undefined,
    customerNeeds: input.includeCustomerNeeds ? (await issue.needs({ first: 250 })).nodes : undefined,
    releases: input.includeReleases ? (await issue.releases({ first: 250 })).nodes : undefined,
  };
});
