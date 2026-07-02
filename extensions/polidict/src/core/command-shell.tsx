import { Action, Icon, showToast, Toast } from "@raycast/api";
import type { ReactNode } from "react";
import { useAuth, useLanguageManagement } from "../hooks";
import type { SupportedLanguage } from "../types";
import { AuthGate } from "./auth-gate";
import { CommandErrorView } from "./command-error-view";
import { LanguageSetup } from "../components/LanguageSetup";

export interface CommandShellContext {
  authIdentity: string;
  currentLanguage: SupportedLanguage;
  languageActions: ReturnType<typeof useLanguageManagement>["languageActions"];
  nativeLanguage?: SupportedLanguage;
  signOutAction: ReactNode;
}

interface CommandShellProps {
  children: (context: CommandShellContext) => ReactNode;
}

export function CommandShell({ children }: CommandShellProps) {
  const {
    isLoading: authLoading,
    isAuthenticated,
    authIdentity,
    signInWithGoogle,
    requestEmailMagicLink,
    verifyEmailMagicLink,
    signOut,
  } = useAuth();
  const {
    currentLanguage,
    nativeLanguage,
    hasLanguages,
    isLoading: isLoadingLanguages,
    addLanguage,
    setNativeLanguage,
    revalidate: revalidateLanguages,
    languageActions,
  } = useLanguageManagement(authIdentity, isAuthenticated);

  async function handleSignOut() {
    try {
      await signOut();
      showToast({
        style: Toast.Style.Success,
        title: "Signed out",
      });
    } catch {
      // Error toast is shown by useAuth.
    }
  }

  if (authLoading) {
    return (
      <AuthGate
        isLoading
        signInWithGoogle={signInWithGoogle}
        requestEmailMagicLink={requestEmailMagicLink}
        verifyEmailMagicLink={verifyEmailMagicLink}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGate
        isLoading={false}
        signInWithGoogle={signInWithGoogle}
        requestEmailMagicLink={requestEmailMagicLink}
        verifyEmailMagicLink={verifyEmailMagicLink}
      />
    );
  }

  if (isLoadingLanguages) {
    return (
      <CommandErrorView
        icon={Icon.Clock}
        title="Loading languages"
        description="Checking your study language setup"
        isLoading
      />
    );
  }

  if (!hasLanguages) {
    return (
      <LanguageSetup onComplete={revalidateLanguages} addLanguage={addLanguage} setNativeLanguage={setNativeLanguage} />
    );
  }

  if (!currentLanguage) {
    return (
      <CommandErrorView
        icon={Icon.Warning}
        title="Study language unavailable"
        description="Set up a study language in View Vocabulary and try again."
      />
    );
  }

  return children({
    authIdentity,
    currentLanguage,
    languageActions,
    nativeLanguage,
    signOutAction: (
      <Action icon={Icon.Logout} title="Sign out" style={Action.Style.Destructive} onAction={handleSignOut} />
    ),
  });
}
