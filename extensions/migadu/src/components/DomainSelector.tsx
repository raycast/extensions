import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import { getDomains } from "../utils/api";

type Props = {
  onDomainSelected: (domain: string) => void;
};
export default function DomainSelector({ onDomainSelected }: Props) {
  type FormValues = {
    domain: string;
  };

  const { isLoading, data: domains = [] } = useCachedPromise(async () => {
    const response = await getDomains();
    if (!("error" in response)) return response.domains;
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      onDomainSelected(values.domain);
    },
    validation: {
      domain: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" {...itemProps.domain}>
        {domains.map((domain) => (
          <Form.Dropdown.Item
            value={domain.name}
            title={domain.name}
            icon={getFavicon(`https://${domain.name}`)}
            key={domain.name}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
