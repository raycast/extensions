import { Action, ActionPanel, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useCachedState, useForm } from "@raycast/utils";

type ConferenceProvider = {
  name: string;
  link: string;
};

function ConferenceProviderForm(props: { provider?: ConferenceProvider }) {
  const [, setConferenceProviders] = useConferenceProviders();
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<ConferenceProvider>({
    initialValues: props.provider,
    validation: {
      name: FormValidation.Required,
      link: FormValidation.Required,
    },
    onSubmit: (values) => {
      setConferenceProviders((providers) => {
        const updatedProviders = [...providers];
        const existingProviderIndex = updatedProviders.findIndex(
          (provider) => provider.name === values.name && provider.link === values.link,
        );

        if (existingProviderIndex !== -1) {
          updatedProviders[existingProviderIndex] = values; // Edit existing provider
        } else {
          updatedProviders.push(values); // Add new provider
        }

        return updatedProviders;
      });
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={props.provider ? "Edit Provider" : "Create Provider"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Provider name, e.g. Zoom" {...itemProps.name} />
      <Form.TextField title="Link" placeholder="Provider link, e.g. https://zoom.us/j/1234567890" {...itemProps.link} />
    </Form>
  );
}

function ConferencingProviderList() {
  const [conferenceProviders, setConferenceProviders] = useConferenceProviders();

  return (
    <List isLoading={conferenceProviders.length === 0} searchBarPlaceholder="Filter conference providers...">
      {conferenceProviders.map((provider) => (
        <List.Item
          key={`${provider.name}-${provider.link}`}
          icon={getFavicon(provider.link)}
          title={provider.name}
          subtitle={provider.link}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Edit Conference Provider"
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<ConferenceProviderForm provider={provider} />}
              />
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Remove Conference Provider"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    setConferenceProviders((providers) => providers.filter((p) => p !== provider));
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function useConferenceProviders() {
  return useCachedState<ConferenceProvider[]>("conferencing-providers", []);
}

export function ConferenceProviderActions() {
  return (
    <ActionPanel.Section title="Conferencing">
      <Action.Push
        icon={Icon.NewDocument}
        title="Add Conference Provider"
        shortcut={Keyboard.Shortcut.Common.New}
        target={<ConferenceProviderForm />}
      />
      <Action.Push
        icon={Icon.Pencil}
        title="Edit Conference Providers"
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<ConferencingProviderList />}
      />
    </ActionPanel.Section>
  );
}
