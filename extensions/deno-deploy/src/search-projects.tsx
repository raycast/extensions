import ProjectListSection from "@/pages/lists/projects-list";

import { ErrorBoundaryProvider } from "./context/ErrorBoundary";
import WithValidToken from "./pages/components/with-valid-token";

function Main() {
  return (
    <ErrorBoundaryProvider>
      <WithValidToken>
        <ProjectListSection />
      </WithValidToken>
    </ErrorBoundaryProvider>
  );
}

export default Main;
