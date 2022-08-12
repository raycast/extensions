import ProjectListSection from "./pages/lists/projects-list";
import isValidToken from "./utils/is-valid-token";

function Main() {
  isValidToken();
  return <ProjectListSection />;
}

export default Main;
