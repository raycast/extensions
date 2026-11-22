import { Action, ActionPanel, Form, Icon, Keyboard, List, LocalStorage, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

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
        const existingProviderIndex = props.provider
          ? providers.findIndex(
              (provider) => provider.name === props.provider?.name && provider.link === props.provider?.link,
            )
          : -1;

        if (existingProviderIndex !== -1) {
          const updatedProviders = [...providers];
          updatedProviders[existingProviderIndex] = values;
          return updatedProviders;
        } else {
          return [...providers, values];
        }
      });
      setTimeout(pop, 0);
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
  const [conferenceProviders, setConferenceProviders, isLoading] = useConferenceProviders();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter conference providers...">
      {!isLoading && conferenceProviders.length === 0 && (
        <List.EmptyView
          icon={Icon.Video}
          title="No Conference Providers"
          description="Add a provider to use a custom conferencing link."
          actions={
            <ActionPanel>
              <AddConferenceProviderAction />
            </ActionPanel>
          }
        />
      )}
      {conferenceProviders.map((provider) => (
        <List.Item
          key={`${provider.name}-${provider.link}`}
          icon={getFavicon(provider.link)}
          title={provider.name}
          subtitle={provider.link}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
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
  const [conferenceProviders, setConferenceProviders] = useState<ConferenceProvider[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    LocalStorage.getItem<string>("conferencing-providers")
      .then((value) => {
        if (!isMounted) return;

        try {
          setConferenceProviders(value ? JSON.parse(value) : []);
        } catch {
          setConferenceProviders([]);
        }
      })
      .catch(() => {
        if (isMounted) setConferenceProviders([]);
      })
      .finally(() => {
        if (isMounted) setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    void LocalStorage.setItem("conferencing-providers", JSON.stringify(conferenceProviders));
  }, [conferenceProviders, isLoaded]);

  const updateConferenceProviders: Dispatch<SetStateAction<ConferenceProvider[]>> = (update) => {
    setConferenceProviders(update);
  };

  return [conferenceProviders, updateConferenceProviders, !isLoaded] as const;
}

export function AddConferenceProviderAction() {
  return (
    <Action.Push
      icon={Icon.NewDocument}
      title="Add Conference Provider"
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ConferenceProviderForm />}
    />
  );
}

export function EditConferenceProvidersAction() {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Edit Conference Providers"
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={<ConferencingProviderList />}
    />
  );
}
