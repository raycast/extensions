import { useNavigation } from "@raycast/api";
import React, { useCallback } from "react";
import { AppleLoginForm } from "../components/forms/AppleLoginForm";
import { AppleTwoFactorForm } from "../components/forms/AppleTwoFactorForm";
import { loginToAppleId, storeAppleId, storePassword } from "../utils/auth";

export interface AuthNavigationHelpers {
  pushLoginForm: (onSuccess?: () => void) => void;
  push2FAForm: (sessionToken: string, onSuccess?: () => void) => void;
  popToRoot: () => void;
}

export function useAuthNavigation(): AuthNavigationHelpers {
  const { push, pop } = useNavigation();

  const push2FAForm = useCallback(
    (sessionToken: string, onSuccess?: () => void) => {
      push(
        <AppleTwoFactorForm
          onSubmit={async ({ code }) => {
            // For 2FA, we need to re-authenticate with the stored credentials plus the 2FA code
            // The credentials should already be stored from the initial login attempt
            await loginToAppleId(undefined, undefined, code);

            // Call success callback if provided
            if (onSuccess) {
              onSuccess();
            }

            // Pop back to the previous screen
            pop();
          }}
        />,
      );
    },
    [push, pop],
  );

  const pushLoginForm = useCallback(
    (onSuccess?: () => void) => {
      push(
        <AppleLoginForm
          onSubmit={async ({ email, password }) => {
            try {
              // Always store credentials for a persistent, seamless experience
              await storeAppleId(email);
              await storePassword(password);

              // Attempt login
              await loginToAppleId(email, password);

              // Call success callback if provided
              if (onSuccess) {
                onSuccess();
              }

              // Pop back to the previous screen
              pop();
            } catch (error) {
              // If 2FA is needed, push the 2FA form
              if (error instanceof Error && error.name === "Needs2FAError") {
                // Ensure credentials are stored so they're available for 2FA
                await storeAppleId(email);
                await storePassword(password);

                // Push 2FA form
                push2FAForm("", onSuccess);
              } else {
                // Re-throw other errors to be handled by the form
                throw error;
              }
            }
          }}
        />,
      );
    },
    [push, pop, push2FAForm],
  );

  const popToRoot = useCallback(() => {
    pop();
  }, [pop]);

  return {
    pushLoginForm,
    push2FAForm,
    popToRoot,
  };
}
