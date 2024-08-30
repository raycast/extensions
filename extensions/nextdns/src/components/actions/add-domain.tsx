import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import isValidDomain from "is-valid-domain";
import { DomainSubmitValues, Mutate } from "../../types/nextdns";
import { addDomain } from "../../libs/api";

export default function AddDomain(props: { type: string; mutate?: Mutate | undefined }) {
  const { pop } = useNavigation();
  const { type, mutate } = props;
  const description =
    type === "allow"
      ? "Allowing a domain will automatically allow all its subdomains. Allowing takes precedence over everything else, including security features."
      : "Denying a domain will automatically deny all its subdomains.";
  const { itemProps, handleSubmit } = useForm<DomainSubmitValues>({
    async onSubmit(values) {
      if (mutate) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Adding Domain" });
        try {
          await mutate(
            addDomain({ domain: values.domain, type }).then((d) => console.log(d)),
            {
              optimisticUpdate(data) {
                const { result, profileName } = data;
                const id = values.domain + "-raycast"; // we append '-raycast' in case domain already exists which will cause duplicate key error
                result.push({ id, type: "", active: true });
                return { result, profileName };
              },
            },
          );
          toast.style = Toast.Style.Success;
          toast.title = "Added Domain";
          toast.message = values.domain;
          pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not Add Domain";
        }
      }
    },
    validation: {
      domain(value) {
        if (!value) return "The item is required";
        if (!isValidDomain(value)) return "The item must be a valid domain";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Add Site" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* <Form.Description text={`Configuring profile "${profileName}" (${preferences.nextdns_profile_id})`} /> */}

      <Form.TextField title="Add a Domain" placeholder="example.com" {...itemProps.domain} />

      <Form.Description text={description} />
    </Form>
  );
}
