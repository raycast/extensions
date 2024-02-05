import ProjectListSection from "@/pages/lists/projects-list";
import isValidToken from "@/utils/accesstoken";

function Main() {
  isValidToken();
  return <ProjectListSection />;
}

export default Main;
