import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail } from "@raycast/api";
import { validateEmail, ValidationResponse } from "./api-client";

interface FormValues {
  email: string;
  name?: string;
  userAgent?: string;
  ip?: string;
}

interface ValidationResult extends ValidationResponse {
  email: string;
}

export default function ValidateEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const result = await validateEmail(values.email, values.name, values.userAgent, values.ip);
      const validationResult: ValidationResult = {
        ...result,
        email: values.email,
      };
      push(<ResultView result={validationResult} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="Enter email to validate" />
      <Form.TextField id="name" title="Name" placeholder="Enter name (optional)" />
      <Form.TextField id="userAgent" title="User Agent" placeholder="Enter user agent (optional)" />
      <Form.TextField id="ip" title="IP Address" placeholder="Enter IP address (optional)" />
    </Form>
  );
}

function ResultView({ result }: { result: ValidationResult }) {
  const markdown = `
# Email Validation Result

Email: ${result.email}
Valid: ${result.valid ? "Yes" : "No"}
${result.reason ? `Reason: ${result.reason}` : ""}
  `;

  return <Detail markdown={markdown} />;
}
