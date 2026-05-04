import { Action, ActionPanel, Icon } from "@raycast/api";
import { CommandErrorView } from "./command-error-view";
import { EmailSignInForm } from "../components/EmailSignInForm";

interface AuthGateProps {
  isLoading: boolean;
  requestEmailMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  verifyEmailMagicLink: (magicLinkOrToken: string) => Promise<void>;
}

export function AuthGate({ isLoading, requestEmailMagicLink, signInWithGoogle, verifyEmailMagicLink }: AuthGateProps) {
  if (isLoading) {
    return (
      <CommandErrorView
        icon={Icon.Clock}
        title="Loading account"
        description="Checking your sign-in status"
        isLoading
      />
    );
  }

  return (
    <CommandErrorView
      icon={Icon.Person}
      title="Not authenticated"
      description="Please sign in to use Polidict"
      actions={
        <ActionPanel>
          <Action title="Sign in with Google" icon={Icon.Key} onAction={signInWithGoogle} />
          <Action.Push
            title="Sign in with Email"
            icon={Icon.Envelope}
            target={
              <EmailSignInForm
                signInWithGoogle={signInWithGoogle}
                requestEmailMagicLink={requestEmailMagicLink}
                verifyEmailMagicLink={verifyEmailMagicLink}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}
