import { showToast, Toast, ActionPanel, Action, Form, LaunchProps, popToRoot, Icon } from "@raycast/api";
import { useForm, FormValidation, getFavicon, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getDomains, updateDomainSettings } from "./utils/api";
import { Domain, Response, UpdateDomainSettingsRequest } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

interface DomainArgs {
  domain: string;
}

export default function UpdateDomainSettings(props: LaunchProps<{ arguments: DomainArgs }>) {
  const propDomain = props.arguments.domain;

  const [error, setError] = useState("");
  const [domains, setDomains] = useCachedState<Domain[]>("domains");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getDomains();

      if (response.type === "error") {
        setError(response.message);
      } else {
        setDomains(response.result.domains);
      }
      setIsLoading(false);
    }

    getFromApi();
  }, []);

  const { handleSubmit, itemProps, setValue } = useForm<UpdateDomainSettingsRequest>({
    async onSubmit(values) {
      setIsLoading(true);

      const response = await updateDomainSettings({ ...values });
      if (response.type === "success") {
        await showToast(Toast.Style.Success, "Domain Settings Updated", "DOMAIN: " + values.name);
        popToRoot({ clearSearchBar: true });
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
    <ErrorComponent error={error} />
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
