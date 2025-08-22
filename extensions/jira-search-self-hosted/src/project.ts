import { ResultItem as GeneralResultItem, SearchCommand } from "./command";
import { jiraFetchObject, jiraUrl } from "./jira";
import { jiraImage } from "./image";

interface Project {
  id: string;
  name: string;
  key: string;
  avatarUrls: {
    "48x48": string;
  };
}

type ResultItem = GeneralResultItem & {
  title: string;
  subtitle: string;
};

/**
 * Searches for projects in Jira
 * @param query Search query
 * @returns Array of project result items
 */
export async function searchProjects(query: string): Promise<ResultItem[]> {
  try {
    const projects = await jiraFetchObject<Array<Project>>("/rest/api/2/project");

    const mapResult = async (project: Project): Promise<ResultItem> => ({
      id: project.id,
      title: project.name,
      subtitle: project.key,
      icon: await jiraImage(project.avatarUrls["48x48"]),
      url: `${jiraUrl}/browse/${project.key}`,
    });

    return projects && projects.length > 0
      ? (await Promise.all(projects.map(mapResult))).filter((result) => {
          const filterBy = filterUsing(query);
          return filterBy(result.title) || filterBy(result.subtitle);
        })
      : [];
  } catch (error) {
    console.error("Failed to load projects:", error);
    return [];
  }
}

function includesCaseInsensitive(projectProp: string, query: string): boolean {
  return projectProp.toLowerCase().includes(query.toLowerCase());
}

function filterUsing(query: string): (projectProp: string) => boolean {
  return (projectProp) => includesCaseInsensitive(projectProp, query);
}

export default function SearchProjectCommand() {
  return SearchCommand(searchProjects, "Search project by title");
}
