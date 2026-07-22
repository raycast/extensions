import { withLinearClient } from "./api/linear-client";
import { ProjectList } from "./components/project-list";

function SearchProjects() {
  return <ProjectList />;
}

export default withLinearClient(SearchProjects);
