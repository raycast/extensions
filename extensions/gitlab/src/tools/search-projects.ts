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
  /**
   * Whether to limit by projects that are not archived and not marked for deletion (as per API).
   */
  active?: boolean;
};

export default async function ({ query, membership, active }: Input) {
  const projects = await gitlab.getProjects({
    searchText: query,
    searchIn: "title",
    membership: membership ?? "true",
    active: active ?? false,
  });

  return projects;
}
