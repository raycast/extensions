import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";

const DOMAINS = getPreferenceValues<Preferences>().domains;
type Props = {
  onDomainSelected: (domain: string) => void;
};
export default function DomainSelector({ onDomainSelected }: Props) {
  type FormValues = {
    domain: string;
  };

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
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" {...itemProps.domain}>
        {DOMAINS.replaceAll(" ", "")
          .split(",")
          .map((domain) => (
            <Form.Dropdown.Item value={domain} title={domain} icon={getFavicon(`https://${domain}`)} key={domain} />
          ))}
      </Form.Dropdown>
    </Form>
  );
}
