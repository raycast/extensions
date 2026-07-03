import RepoList from "./components/RepoList";
import ListWorkflowsActionPanelSection from "./components/ListWorkflowsActionPanelSection";

export default function Command() {
  return <RepoList ActionsComponent={ListWorkflowsActionPanelSection} />;
}
