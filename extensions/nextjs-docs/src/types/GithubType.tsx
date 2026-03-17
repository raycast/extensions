import type { components } from "@octokit/openapi-types";

export type TreeType = components["schemas"]["git-tree"]["tree"][number];

export interface TopicType {
  name: string;
  sha: string;
  type: string;
  path: string;
  filepath: string;
  title: string;
}
