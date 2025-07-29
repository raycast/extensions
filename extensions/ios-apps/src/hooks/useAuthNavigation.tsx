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

  const pushLoginForm = useCallback(
    (onSuccess?: () => void) => {
      push(
        <AppleLoginForm
          onSubmit={async ({ email, password, saveCredentials }) => {
            // Store credentials for future use if user opted in
            if (saveCredentials) {
              await storeAppleId(email);
              await storePassword(password);
            }

            // Attempt login
            await loginToAppleId(email, password);

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

  const push2FAForm = useCallback(
    (sessionToken: string, onSuccess?: () => void) => {
      push(
        <AppleTwoFactorForm
          onSubmit={async ({ code }) => {
            // Attempt login with 2FA code
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

  const popToRoot = useCallback(() => {
    pop();
  }, [pop]);

  return {
    pushLoginForm,
    push2FAForm,
    popToRoot,
  };
}
