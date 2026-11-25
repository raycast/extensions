import { Form } from "@raycast/api";
import { AuthState } from "../types";
import React from "react";

interface LoginFormProps {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  savedEmail?: string;
}

export function LoginForm({ authState, setAuthState, savedEmail }: Readonly<LoginFormProps>) {
  return (
    <>
      <Form.TextField
        id="email"
        title="Email"
        value={authState.email}
        placeholder={savedEmail ?? "Enter your Ring account email"}
        error={authState.emailError ? "Email is required" : authState.emailFormatError}
        onChange={(newEmail) =>
          setAuthState((prev) => ({
            ...prev,
            email: newEmail.trim(),
            emailError: false,
            emailFormatError: undefined,
          }))
        }
      />
      <Form.PasswordField
        id="password"
        title="Password"
        value={authState.password}
        placeholder="Enter your Ring account password"
        error={authState.passwordError ? "Password is required" : undefined}
        onChange={(newPassword) =>
          setAuthState((prev) => ({
            ...prev,
            password: newPassword,
            passwordError: false,
          }))
        }
      />
    </>
  );
}
