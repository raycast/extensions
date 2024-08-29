import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { DomainSubmitValues } from "../types/nextdns";
import isValidDomain from "is-valid-domain";

//TODO NOT WORKING
export const AddDomain = () => {
  const { handleSubmit, itemProps } = useForm<DomainSubmitValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `account created`,
      });
    },
    validation: {
      domain: (value) => {
        if (value && !isValidDomain(value)) {
          return "Please enter a valid domain";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Configuring profile "" (})`} />

      <Form.TextField title="Add Domain" placeholder="example.com" {...itemProps.domain} />

      <Form.Description text="Allowing a domain will automatically allow all its subdomains. Allowing takes precedence over everything else, including security features." />
    </Form>
  );
};
