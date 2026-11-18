import { readMentionResource } from "./helpers/mentions";
import { client } from "./tools/linearUtils";
import {
  related,
  serializeIssue,
  serializeMilestone,
  serializeProject,
  serializeProjectStatus,
  serializeUser,
  teamRef,
  userRef,
} from "./tools/serializers";
import { withLinear } from "./tools/withLinear";

type Input = {
  /** The URI of a user, issue, or project selected from Linear's mention searches. */
  uri: string;
};

export default withLinear(async ({ uri }: Input) =>
  readMentionResource(uri, {
    users: async (id) => serializeUser(await client().user(id)),
    issues: async (id) => serializeIssue(await client().issue(id)),
    // Who works on the project and where it stands, so a project mentioned beside a person or an
    // issue can be related to them without another lookup.
    projects: async (id) => {
      const project = await client().project(id);
      const [status, lead, teams, members, milestones] = await Promise.all([
        related(project.status, serializeProjectStatus),
        related(project.lead, userRef),
        project.teams({ first: 50 }),
        project.members({ first: 100 }),
        project.projectMilestones({ first: 50 }),
      ]);
      return {
        ...serializeProject(project),
        status,
        lead,
        teams: teams.nodes.map(teamRef),
        teamsPageInfo: { hasNextPage: teams.pageInfo.hasNextPage },
        members: members.nodes.map(userRef),
        membersPageInfo: { hasNextPage: members.pageInfo.hasNextPage },
        milestones: milestones.nodes.map(serializeMilestone),
        milestonesPageInfo: { hasNextPage: milestones.pageInfo.hasNextPage },
      };
    },
  }),
);
