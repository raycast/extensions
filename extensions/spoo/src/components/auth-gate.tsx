import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { reportError } from "@/lib/errors";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const attemptedRef = useRef(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (authLoading || isAuthenticated || attemptedRef.current) return;
    attemptedRef.current = true;
    signIn().catch(async (err) => {
      // User dismissed the overlay or auth failed — let them retry.
      attemptedRef.current = false;
      setCancelled(true);
      if (!isCancellationError(err)) {
        await reportError(err);
      }
    });
  }, [authLoading, isAuthenticated, signIn]);

  if (isAuthenticated) return <>{children}</>;

  if (cancelled) {
    return (
      <Detail
        markdown="# Sign in required\n\nConnect your spoo.me account to continue."
        actions={
          <ActionPanel>
            <Action
              title="Sign in with Spoo.me"
              icon={Icon.Link}
              onAction={() => {
                setCancelled(false);
                attemptedRef.current = false;
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading markdown="" />;
}

function isCancellationError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return /cancel|dismiss|aborted/i.test(message);
}
