import { Form } from "@raycast/api";
import ProjectForm from "./components/ProjectForm";
import { withOAuth } from "./oauth";

export default withOAuth({ fallback: Form })(function CreateProject() {
  return <ProjectForm />;
});
