import { List } from "@raycast/api";

import { FailedPaymentsList } from "./components/FailedPaymentsList";
import { OnboardingDetail } from "./components/OnboardingDetail";
import { useProjects } from "./hooks/useProjects";

export default function FailedPaymentsCommand() {
  const projects = useProjects();

  if (!projects.isLoading && !projects.activeProject) {
    return (
      <OnboardingDetail
        onDidSaveProject={projects.saveProject}
        onUseDemo={projects.enableDemoProject}
      />
    );
  }

  if (!projects.activeProject) {
    return <List isLoading />;
  }

  return <FailedPaymentsList project={projects.activeProject} />;
}
