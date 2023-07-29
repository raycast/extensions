import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import ErrorComponent from "./ErrorComponent";

type Props = {
  onDomainSelected: (domain: string) => void;
};
export default function DomainSelector({ onDomainSelected }: Props) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [cachedDomains] = useCachedState<string[]>("domains", []);

  useEffect(() => {
    if (!cachedDomains.length) {
      push(<ErrorComponent error="Missing Domains" />);
    }
    setIsLoading(false);
  }, []);

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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" {...itemProps.domain}>
        {cachedDomains.map((domain) => (
          <Form.Dropdown.Item value={domain} title={domain} icon={getFavicon(`https://${domain}`)} key={domain} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
