import OrganizationListSection from "@/pages/lists/organizations-list";

import { ErrorBoundaryProvider } from "./context/ErrorBoundary";
import WithValidToken from "./pages/components/with-valid-token";

function Main() {
  return (
    <ErrorBoundaryProvider>
      <WithValidToken>
        <OrganizationListSection />
      </WithValidToken>
    </ErrorBoundaryProvider>
  );
}

export default Main;
