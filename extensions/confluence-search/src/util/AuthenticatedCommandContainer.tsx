import { List } from "@raycast/api";
import { ApolloProvider } from "@apollo/client";
import { useAuthorizeSite, useGraphqlClient } from "./hooks";
import { SiteContext } from "./SiteContext";

function AuthenticatedCommandContainer({ Command, checkScopes }: AuthenticatedCommandContainerProps) {
  const site = useAuthorizeSite(checkScopes);
  const client = useGraphqlClient();

  if (!site || !client) {
    // Known issue - the search placeholder if custom flickers
    return <List isLoading={true}></List>;
  }

  return (
    <ApolloProvider client={client}>
      <SiteContext.Provider value={site}>
        <Command />
      </SiteContext.Provider>
    </ApolloProvider>
  );
}

interface AuthenticatedCommandContainerProps {
  Command: React.FC;
  checkScopes?: boolean;
}

// Helper to keep the code a bit cleaner
export const buildAuthenticatedCommand = (props: AuthenticatedCommandContainerProps) => () =>
  AuthenticatedCommandContainer(props);
