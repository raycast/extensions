import RepoList from "./components/RepoList";
import RunWorkflowActionPanelSection from "./components/RunWorkflowActionPanelSection";

export default function Command() {
  return <RepoList ActionsComponent={RunWorkflowActionPanelSection} />;
}
