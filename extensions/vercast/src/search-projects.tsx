import ProjectListSection from "./pages/lists/projects-list";
import WithValidToken from "./pages/with-valid-token";

function Main() {
  return (
    <WithValidToken>
      <ProjectListSection />
    </WithValidToken>
  );
}

export default Main;
