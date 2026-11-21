import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ReactElement } from "react";
import { probeSession } from "./auth";
import { SignIn } from "./sign-in";

export function RequireSignIn({ children }: { children: ReactElement }) {
  const session = usePromise(probeSession);
  if (session.isLoading) return <List isLoading />;
  if (session.error) {
    return (
      <List>
        <List.EmptyView
          title="Couldn't reach Taskit"
          description={session.error.message}
        />
      </List>
    );
  }
  if (!session.data)
    return <SignIn onSignedIn={() => void session.revalidate()} />;
  return children;
}
