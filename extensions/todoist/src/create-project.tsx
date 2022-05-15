import ProjectForm from "./components/ProjectForm";
import { withOAuth } from "./oauth";

export default withOAuth()(function CreateProject() {
  return <ProjectForm />;
});
