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

export async function searchProjects(query: string): Promise<ResultItem[]> {
  const result = await jiraFetchObject<Array<Project>>("/rest/api/2/project");
  const mapResult = async (project: Project): Promise<ResultItem> => ({
    id: project.id,
    title: project.name,
    subtitle: project.key,
    icon: await jiraImage(project.avatarUrls["48x48"]),
    url: `${jiraUrl}/browse/${project.key}`,
  });
  return result && result.length > 0
    ? (await Promise.all(result.map(mapResult))).filter((result) => {
        const filterBy = filterUsing(query);
        return filterBy(result.title) || filterBy(result.subtitle);
      })
    : [];
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
