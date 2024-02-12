import CreatePlayground from "@/pages/form/create-playground";

import { ErrorBoundaryProvider } from "./context/ErrorBoundary";
import WithValidToken from "./pages/components/with-valid-token";

function Main() {
  return (
    <ErrorBoundaryProvider>
      <WithValidToken>
        <CreatePlayground />
      </WithValidToken>
    </ErrorBoundaryProvider>
  );
}

export default Main;
