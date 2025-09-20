import { showToast, Toast, ActionPanel, Action, Form, LaunchProps, Icon } from "@raycast/api";
import { useForm, FormValidation, getFavicon } from "@raycast/utils";
import { UpdateDomainSettingsRequest } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";
import { callApi, useDomains } from "./utils/hooks";

interface DomainArgs {
  domain: string;
}

export default function UpdateDomainSettings(props: LaunchProps<{ arguments: DomainArgs }>) {
  const propDomain = props.arguments.domain;
  const { isLoading, data, error, mutate } = useDomains();
  const domains = data.filter((d) => !d.isShared);

  const { handleSubmit, itemProps, setValue } = useForm<UpdateDomainSettingsRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating Domain");
      try {
        await mutate(callApi("updateDomainSettings", { body: values }), {
          optimisticUpdate(data) {
            const index = data.findIndex((d) => d.name === values.name);
            const d = data[index];
            data[index] = {
              ...d,
              allowAccountReset: values.allowAccountReset,
              symbolicSubaddressing: values.allowAccountReset,
            };
            return data;
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Domain Settings Updated";
        toast.message = "DOMAIN: " + values.name;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = (error as Error).cause as string;
        toast.message = (error as Error).message;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: {
      name: domains?.length ? propDomain : undefined,
    },
  });

  const handleDomainChange = (newDomain: string) => {
    setValue("allowAccountReset", domains?.find((d) => d.name === newDomain)?.allowAccountReset || false);
    setValue("symbolicSubaddressing", domains?.find((d) => d.name === newDomain)?.symbolicSubaddressing || false);
  };

  return error ? (
    <ErrorComponent error={error.message} />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Domain Settings" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" placeholder="Select a domain" {...itemProps.name} onChange={handleDomainChange}>
        {domains?.map((domain) => (
          <Form.Dropdown.Item
            key={domain.name}
            value={domain.name}
            title={domain.name}
            icon={getFavicon(`https://${domain.name}`)}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        label="Allow Account Reset"
        info="If your account allows password reset, then only domains with this option enabled can be used for password reset. In essence, owning domains with this option enabled is equivalent to owning the account."
        {...itemProps.allowAccountReset}
      />
      <Form.Checkbox
        label="Symbolic Subaddressing"
        info="If enabled, everything after a symbol character in an email address will be ignored"
        {...itemProps.symbolicSubaddressing}
      />
      <Form.Checkbox label="Recheck DNS" {...itemProps.recheckDns} />
    </Form>
  );
}
