import { serializeIssue } from "./issueUtils";
import { resolveIssue } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  id: string;
  includeRelations?: boolean;
  includeCustomerNeeds?: boolean;
  includeReleases?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
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
