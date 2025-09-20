import { Form } from "@raycast/api";
import { AuthState } from "../types";
import React from "react";

interface TwoFactorFormProps {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  twoFactorRef: React.RefObject<Form.TextField>;
}

export function sanitizeTwoFactorCode(
  input: string,
  prevInput: string,
): {
  code: string;
  numericError?: string;
  warning?: string;
} {
  const numericOnly = input.replace(/\D/g, "");

  const isPaste = input.length > prevInput.length + 2;
  const hasNonNumeric = /\D/.test(input);
  const isTooLong = numericOnly.length > 6;
  const lastCharIsNonNumeric = input.length > 0 && /\D/.test(input[input.length - 1]);

  return {
    code: numericOnly.slice(0, 6),
    numericError: isTooLong ? "6 digits max" : lastCharIsNonNumeric ? "Only numbers allowed" : undefined,
    warning:
      isPaste && hasNonNumeric && numericOnly.length > 0 ? "Non-numeric characters have been removed" : undefined,
  };
}

export function TwoFactorForm({ authState, setAuthState, twoFactorRef }: Readonly<TwoFactorFormProps>) {
  return (
    <>
      <Form.TextField
        id="twoFactorCode"
        title="2FA Code"
        ref={twoFactorRef}
        placeholder={authState.twoFactorPrompt}
        value={authState.twoFactorCode}
        autoFocus
        error={
          authState.twoFactorError
            ? "Code is required"
            : authState.twoFactorNumericError !== undefined
              ? authState.twoFactorNumericError
              : undefined
        }
        onChange={(newInput) => {
          const { code, numericError, warning } = sanitizeTwoFactorCode(newInput, authState.twoFactorCode);

          setAuthState((prev) => ({
            ...prev,
            twoFactorCode: code,
            twoFactorError: false,
            twoFactorNumericError: numericError,
            twoFactorWarning: warning,
          }));

          if (numericError === "6 digits max" || (code.length === 6 && numericError === "Only numbers allowed")) {
            setTimeout(() => {
              setAuthState((prev) => ({
                ...prev,
                twoFactorNumericError: undefined,
              }));
            }, 1000);
          }
        }}
      />
      {authState.twoFactorWarning && <Form.Description text={authState.twoFactorWarning} />}
    </>
  );
}
