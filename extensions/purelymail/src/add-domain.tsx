import { ActionPanel, Form, Action, Toast, popToRoot, showToast, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { Response } from "./utils/types";
import { addDomain } from "./utils/api";
import ErrorComponent from "./components/ErrorComponent";

interface State {
  isLoading?: boolean;
  error: string;
}
interface FormValues {
  domainName: string;
}

export default function AddDomain() {
  const [state, setState] = useState<State>({
    isLoading: false,
    error: "",
  });

  const { handleSubmit, setValidationError, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setState((prevState) => {
        return { ...prevState, isLoading: true };
      });

      const response: Response = await addDomain(values.domainName);
      switch (response.type) {
        case "error":
          await showToast(Toast.Style.Failure, "Purelymail Error", response.message);
          setState((prevState) => {
            return { ...prevState, isLoading: false, error: response.message };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          await showToast(Toast.Style.Success, "Domain Added", "Domain added successfully to your Purelymail account.");
          popToRoot({ clearSearchBar: true });
          break;

        default:
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    },
    validation: {
      domainName: FormValidation.Required,
    },
  });

  const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  const handleDomainChange = (newDomain: string) => {
    setValidationError("domainName", "");
    if (newDomain.length > 0) {
      setValidationError("domainName", DOMAIN_REGEX.test(newDomain) ? "" : "Invalid domain");
    } else {
      setValidationError("domainName", "The item is required");
    }
  };

  return state.error ? (
    <ErrorComponent error={state.error} />
  ) : (
    <Form
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Domain" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        autoFocus
        info="Enter a domain to add to your Purelymail account."
        title="Domain"
        placeholder="example.com"
        {...itemProps.domainName}
        onChange={handleDomainChange}
      />
      <Form.Description text="Before adding domain, make sure you have added Ownership Code to DNS Records." />
    </Form>
  );
}
