import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import isValidDomain from "is-valid-domain";
import { DomainListItem, DomainSubmitValues, Mutate } from "../types";
import { addDomain } from "../libs/api";

export default function AddDomain(props: { type: string; mutate?: Mutate; data?: DomainListItem[] }) {
  const { pop } = useNavigation();
  const { type, mutate, data } = props;
  const description =
    type === "allow"
      ? "Allowing a domain will automatically allow all its subdomains. Allowing takes precedence over everything else, including security features."
      : "Denying a domain will automatically deny all its subdomains.";
  const { itemProps, handleSubmit } = useForm<DomainSubmitValues>({
    async onSubmit(values) {
      if (mutate) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Adding Domain", message: values.domain });
        try {
          await mutate(addDomain({ domain: values.domain, type }), {
            optimisticUpdate(data) {
              const { result, profileName } = data;

              result.unshift({ id: values.domain, type, active: true });
              return { result, profileName };
            },
          });
          toast.style = Toast.Style.Success;
          toast.title = "Added domain";
          pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not add domain";
        }
      }
    },
    validation: {
      domain(value) {
        if (!value) return "The item is required";
        if (!isValidDomain(value)) return "The item must be a valid domain";
        if (data && data.some((item) => item.id === value)) return "Domain already added";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Add Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Add a Domain" placeholder="example.com" {...itemProps.domain} />

      <Form.Description text={description} />
    </Form>
  );
}
