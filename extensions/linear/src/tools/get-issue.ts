import { resolveIssue } from "./linearUtils";
import {
  serializeAttachment,
  serializeCustomerNeed,
  serializeIssue,
  serializeIssueRelation,
  serializeRelease,
} from "./serializers";
import { withLinear } from "./withLinear";

type Input = {
  id: string;
  includeRelations?: boolean;
  includeCustomerNeeds?: boolean;
  includeReleases?: boolean;
};

export default withLinear(async (input: Input) => {
  const issue = await resolveIssue(input.id);
  return {
    ...(await serializeIssue(issue)),
    branchName: issue.branchName,
    attachments: (await issue.attachments({ first: 250 })).nodes.map(serializeAttachment),
    relations: input.includeRelations
      ? {
          outgoing: await Promise.all((await issue.relations({ first: 250 })).nodes.map(serializeIssueRelation)),
          incoming: await Promise.all((await issue.inverseRelations({ first: 250 })).nodes.map(serializeIssueRelation)),
        }
      : undefined,
    customerNeeds: input.includeCustomerNeeds
      ? (await issue.needs({ first: 250 })).nodes.map(serializeCustomerNeed)
      : undefined,
    releases: input.includeReleases
      ? (await issue.releases({ first: 250 })).nodes.map((release) => serializeRelease(release))
      : undefined,
  };
});
