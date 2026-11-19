import { Icon } from "@raycast/api";
import { getProjects } from "../api";
import { MENTION_LIMIT, projectUri, type MentionItem } from "../mentions";

type Input = {
  /** What the user typed after choosing the search, empty for the default list. */
  query: string;
};

// Projects for the AI Chat `@` menu. A mentioned project reaches the AI through
// `read-item`, which includes its ID, so the AI can start a timer or log time on it
// without looking it up first. (A line comment: JSDoc here would become tool instructions.)
export default async function (input: Input): Promise<MentionItem[]> {
  const projects = await getProjects();
  const needle = input.query.trim().toLowerCase();

  return projects
    .filter(
      (project) =>
        !needle ||
        `${project.title} ${project.employer ?? ""}`
          .toLowerCase()
          .includes(needle),
    )
    .slice(0, MENTION_LIMIT)
    .map((project) => ({
      title: project.title,
      uri: projectUri(project.id),
      description: project.employer || project.team?.name,
      icon: Icon.Folder,
    }));
}
