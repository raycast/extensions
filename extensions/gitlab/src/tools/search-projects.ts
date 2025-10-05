import { gitlab } from "../common";

type Input = {
  /**
   * Search keyword applied to project name/title.
   */
  query: string;
  /**
   * Whether to limit to member projects. String 'true' or 'false' (as per API).
   */
  membership?: string;
};

export default async function ({ query, membership }: Input) {
  const projects = await gitlab.getProjects({
    searchText: query,
    searchIn: "title",
    membership: membership ?? "true",
  });

  return projects;
}
