import { ActionPanel, Form, Action, Toast, popToRoot, showToast, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { AddDomainRequest, Response } from "./utils/types";
import { addDomain } from "./utils/api";
import { DOMAIN_REGEX } from "./utils/constants";

export default function AddDomain() {
  const [isLoading, setIsLoading] = useState(false);
  
  const { handleSubmit, itemProps } = useForm<AddDomainRequest>({
    async onSubmit(values) {
      setIsLoading(true);

      const response: Response = await addDomain(values.domainName);
      if (response.type==="success") {
        await showToast(Toast.Style.Success, "Domain Added", "Domain added successfully to your Purelymail account.");
        popToRoot({ clearSearchBar: true });
      }
      setIsLoading(false);
    },
    validation: {
      domainName(value) {
          if (!value) return "The item is required";
          else if (!DOMAIN_REGEX.test(value)) return "The item is invalid";
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
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
      />
      <Form.Description text="Before adding domain, make sure you have added Ownership Code to DNS Records." />
    </Form>
  );
}
