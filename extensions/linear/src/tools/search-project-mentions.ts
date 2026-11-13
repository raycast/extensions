import { getMentionProjects } from "../api/getProjects";
import { getProjectMentionIcon } from "../helpers/mentionIcons";
import {
  ACTIVE_PROJECT_MENTION_FILTER,
  MY_PROJECT_MENTION_FILTER,
  getProjectMentionFilter,
  mergeMentionProjects,
  toProjectMentions,
} from "../helpers/mentions";

import { withLinear } from "./withLinear";

type Input = {
  /** What the user typed in the Projects mention search, empty for your active projects. */
  query: string;
};

/**
 * A typed query searches every project in the workspace by name. The empty query lists the active
 * projects you lead or are a member of first, then fills up with the workspace's other recently
 * updated active projects, so the default list is useful even for someone on no project.
 */
export default withLinear(async ({ query }: Input) => {
  if (query.trim()) {
    return toProjectMentions(await getMentionProjects(getProjectMentionFilter(query)), getProjectMentionIcon);
  }
  const [mine, active] = await Promise.all([
    getMentionProjects(MY_PROJECT_MENTION_FILTER),
    getMentionProjects(ACTIVE_PROJECT_MENTION_FILTER),
  ]);
  return toProjectMentions(mergeMentionProjects(mine, active), getProjectMentionIcon);
});
