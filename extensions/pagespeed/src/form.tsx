import { Form, ActionPanel, Action, Toast, showToast, launchCommand, LaunchType } from "@raycast/api";
import { useState } from "react";
import { isDomain, fetchPageSpeed } from "./utils";

export default function PagespeedForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [domainError, setDomainError] = useState<string | undefined>();

  const resetErrors = () => {
    setDomainError(undefined);
  };

  const checkDomain = (value: string | undefined) => {
    if (value && value.length == 0) {
      setDomainError("The domain should't be empty!");
    } else if (!isDomain(value)) {
      setDomainError("The domain is invalid!");
    } else {
      setDomainError(undefined);
      return true;
    }
    return false;
  };

  const handleSubmit = async (values: { nameField: string; domainField: string }) => {
    const check = checkDomain(values.domainField);

    if (!check) {
      return;
    }
    try {
      setIsLoading(true);
      await fetchPageSpeed(values.domainField);
      setIsLoading(false);
      launchCommand({
        name: "pagespeed",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      setIsLoading(false);
      showToast(Toast.Style.Failure, "Failed to fetch PageSpeed report");
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Pagespeed" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Run PageSpeed"
    >
      <Form.TextField
        id="domainField"
        title="Enter a Domain"
        placeholder="example.com"
        error={domainError}
        onChange={resetErrors}
        onBlur={(event) => {
          checkDomain(event?.target?.value);
        }}
      />
    </Form>
  );
}
