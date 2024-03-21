import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { API_DOCS_URL, DEFAULT_NAMESERVERS } from "../../utils/constants";
import { updateNameServersByDomain } from "../../utils/api";

type UpdateNameServersComponentProps = {
  domain: string;
  onNameServersUpdated: () => void;
  initialNS?: string[];
};
export default function UpdateNameServersComponent({
  domain,
  initialNS,
  onNameServersUpdated,
}: UpdateNameServersComponentProps) {
  const { pop } = useNavigation();

  type FormValues = {
    ns: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const response = await updateNameServersByDomain(domain, { ns: values.ns.split(`\n`) });
      if (response.status === "SUCCESS") {
        showToast({
          style: Toast.Style.Success,
          title: "SUCCESS",
          message: `Updated Name Servers`,
        }).then(() => {
          onNameServersUpdated();
          pop();
        });
      }
    },
    validation: {
      ns: FormValidation.Required,
    },
    initialValues: {
      ns: initialNS ? initialNS.join(`\n`) : "",
    },
  });

  return (
    <Form
      navigationTitle="Update Name Servers"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Go to API Reference" url={`${API_DOCS_URL}Domain%20Update%20Name%20Servers`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.TextArea
        title="Name Servers"
        placeholder={DEFAULT_NAMESERVERS.join(`\n`)}
        info="Put one nameserver per line"
        {...itemProps.ns}
      />
    </Form>
  );
}
