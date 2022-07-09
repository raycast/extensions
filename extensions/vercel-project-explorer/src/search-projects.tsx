import ProjectListSection from "./pages/lists/projects-list";
import useVercel from "./hooks/use-vercel-info";
import isValidToken from "./utils/is-valid-token";

function Main() {
  isValidToken();
  const { user, projects, updateProject, selectedTeam, teams } = useVercel();
  return (
    <ProjectListSection
      user={user}
      projects={projects}
      updateProject={updateProject}
      selectedTeam={selectedTeam}
      teams={teams}
    />
  );
}

export default Main;
