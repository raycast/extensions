import { ApolloProvider } from "@apollo/client";
import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { Sourcegraph, sourcegraphCloud } from "../sourcegraph";
import { newApolloClient } from "../sourcegraph/gql/apollo";

/**
 * SelfHostedCommand wraps the given command with the configuration for Sourcegraph Cloud.
 */
export default function CloudCommand({ Command }: { Command: React.FunctionComponent<{ src: Sourcegraph }> }) {
  const src = sourcegraphCloud();

  useEffect(checkAuthEffect(src));

  return (
    <ApolloProvider client={newApolloClient(src)}>
      <Command src={src} />
    </ApolloProvider>
  );
}
