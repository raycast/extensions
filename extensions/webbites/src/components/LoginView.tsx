import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  useNavigation,
  showToast,
  Toast,
  // LocalStorage,
  // Detail
} from "@raycast/api";

import { showFailureToast } from "@raycast/utils";

import { login } from "../utils/auth";

export default function LoginView({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = async (values: {
    email?: string;
    password?: string;
  }) => {
    if (!values.email || !values.password) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: "Email and password are required",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Perform login
      const user = await login(values.email, values.password);

      // Verify storage after login
      // const sessionToken = await LocalStorage.getItem("webbites_session_token");
      // const userData = await LocalStorage.getItem("webbites_user_data");

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Logged in successfully",
        message: `Welcome, ${user.getUsername()}!`,
      });

      // Call the success handler
      onLoginSuccess();
      pop();
    } catch (error) {
      showFailureToast({
        title: "Login failed",
        message: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <>
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Login"
              onSubmit={async (values) => {
                if (!validateEmail(values.email || "")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Invalid email",
                    message: "Please enter a valid email address",
                  });
                  return;
                }
                handleSubmit(values);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description title="" text="Welcome to WebBites!" />

        <Form.TextField
          id="email"
          title="Email"
          placeholder="Enter your email"
        />
        <Form.PasswordField
          id="password"
          title="Password"
          placeholder="Enter your password"
        />
        <Form.Separator />
        <Form.Description
          title="Need help?"
          text="If you have forgotten your password, go to webBites.io and reset it."
        />
      </Form>
      {/* } */}
    </>
  );
}
