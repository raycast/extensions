import { useEffect, useState } from "react";
import { Alias, AliasCreate, AliasEdit, FormAliasCreate, FormAliasEdit } from "./utils/types";
import { createDomainAlias, deleteDomainAlias, editDomainAlias, getDomainAliases } from "./utils/api";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import DomainSelector from "./components/DomainSelector";

export default function Aliases() {
  const { push } = useNavigation();
  const handleDomainSelected = (domain: string) => push(<AliasesIndex domain={domain} />);
  return <DomainSelector onDomainSelected={handleDomainSelected} />;
}

function AliasesIndex({ domain }: { domain: string }) {
  const { push } = useNavigation();
  const [aliases, setAliases] = useCachedState<Alias[]>("aliases", [], {
    cacheNamespace: domain,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function getDomainAliasesFromApi() {
    setIsLoading(true);
    const response = await getDomainAliases(domain);
    if (!("error" in response)) setAliases(response.address_aliases);
    setIsLoading(false);
  }

  useEffect(() => {
    getDomainAliasesFromApi();
  }, []);

  async function confirmAndDelete(alias: Alias) {
    if (
      await confirmAlert({
        title: `Delete '${alias.address}'?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteDomainAlias(domain, alias.local_part);
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Deleted Alias", `${response.address}`);
        await getDomainAliasesFromApi();
      }
      setIsLoading(false);
    }
  }

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search alias...">
      <List.Section title={`${aliases.length} ${aliases.length === 1 ? "alias" : "aliases"}`}>
        {aliases.map((alias) => (
          <List.Item
            key={alias.address}
            title={alias.address}
            icon={Icon.TwoPeople}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Alias"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<AliasesEdit domain={domain} alias={alias} onAliasEdited={getDomainAliasesFromApi} />)
                  }
                />
                <Action
                  title="Delete Alias"
                  icon={Icon.RemovePerson}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(alias)}
                />
                <Action
                  title="Create New Alias"
                  icon={Icon.AddPerson}
                  onAction={() => push(<AliasesCreate domain={domain} onAliasCreated={getDomainAliasesFromApi} />)}
                />
                <Action title="Reload Aliases" icon={Icon.Redo} onAction={getDomainAliasesFromApi} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(alias).map(([key, val]) => {
                      if (val === false)
                        return <List.Item.Detail.Metadata.Label key={key} title={key} icon={Icon.Multiply} />;
                      else if (val === true)
                        return <List.Item.Detail.Metadata.Label key={key} title={key} icon={Icon.Check} />;
                      else if (!val || !val.length)
                        return <List.Item.Detail.Metadata.Label key={key} title={key} icon={Icon.Minus} />;
                      else return <List.Item.Detail.Metadata.Label key={key} title={key} text={val.toString()} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Alias"
            icon={Icon.AddPerson}
            actions={
              <ActionPanel>
                <Action
                  title="Create New Alias"
                  icon={Icon.AddPerson}
                  onAction={() => push(<AliasesCreate domain={domain} onAliasCreated={getDomainAliasesFromApi} />)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Aliases"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload Aliases" icon={Icon.Redo} onAction={getDomainAliasesFromApi} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type AliasesCreateProps = {
  domain: string;
  onAliasCreated: () => void;
};
function AliasesCreate({ domain, onAliasCreated }: AliasesCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<FormAliasCreate>({
    async onSubmit(values) {
      setIsLoading(true);

      let newExpiresOn = null;
      const newExpireDate = values.expires_on;
      if (newExpireDate) {
        const newYear = newExpireDate.getUTCFullYear();
        const newMonth = String(newExpireDate.getUTCMonth()).padStart(2, "0");
        const newDate = String(newExpireDate.getUTCDate()).padStart(2, "0");
        newExpiresOn = `${newYear}-${newMonth}-${newDate}`;
      }
      const newAlias: AliasCreate = { ...values, expires_on: newExpiresOn };

      const response = await createDomainAlias(domain, newAlias);
      if (!("error" in response)) {
        showToast(Toast.Style.Success, "Created Alias", `${response.address} -> ${response.destinations.join()}`);
        onAliasCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      local_part: FormValidation.Required,
      destinations: FormValidation.Required,
      expires_on(value) {
        if (itemProps.expireable.value && !value) return "The item is required";
      },
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />

      <Form.Separator />
      <Form.TextField title="Address" placeholder="recipient" {...itemProps.local_part} />
      <Form.Description text={`${itemProps.local_part.value || "[ADDRESS]"}@${domain}`} />
      <Form.TextField
        title="Local Recipients"
        placeholder={`alias1@${domain},alias2@${domain}`}
        info="Note that aliases can redirect only on the same domain."
        {...itemProps.destinations}
      />
      <Form.Checkbox
        label="Is Internal"
        info="An alias can be restricted to receive messages only via Migadu outgoing servers. No external message would be accepted."
        {...itemProps.is_internal}
      />

      <Form.Separator />
      <Form.Description text="Alias Expiration" />
      <Form.Checkbox label="Expire alias on a date" {...itemProps.expireable} />
      {itemProps.expireable.value && (
        <Form.DatePicker type={Form.DatePicker.Type.Date} title="Expires" {...itemProps.expires_on} />
      )}
      {itemProps.expireable.value && (
        <Form.Checkbox label="Remove alias upon expiry" {...itemProps.remove_upon_expiry} />
      )}
    </Form>
  );
}

type AliasEditProps = {
  domain: string;
  alias: Alias;
  onAliasEdited: () => void;
};
function AliasesEdit({ domain, alias, onAliasEdited }: AliasEditProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<FormAliasEdit>({
    async onSubmit(values) {
      setIsLoading(true);

      let newExpiresOn = null;
      const newExpireDate = values.expires_on;
      if (newExpireDate) {
        const newYear = newExpireDate.getUTCFullYear();
        const newMonth = String(newExpireDate.getUTCMonth()).padStart(2, "0");
        const newDate = String(newExpireDate.getUTCDate()).padStart(2, "0");
        newExpiresOn = `${newYear}-${newMonth}-${newDate}`;
      }
      const modifiedAlias: AliasEdit = { ...values, expires_on: newExpiresOn };
      console.log(modifiedAlias);

      const response = await editDomainAlias(domain, alias.local_part, modifiedAlias);
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Edited Alias", `${response.address} -> ${response.destinations.join()}`);
        onAliasEdited();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      destinations: FormValidation.Required,
    },
    initialValues: {
      is_internal: alias.is_internal,
      destinations: alias.destinations.join(),
      expireable: alias.expireable,
      expires_on: alias.expires_on ? new Date(alias.expires_on) : new Date(),
      remove_upon_expiry: alias.expireable,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.Description title="Alias" text={alias.address} />

      <Form.Separator />
      <Form.TextField
        title="Local Recipients"
        placeholder={`alias1@${domain},alias2@${domain}`}
        info="Note that aliases can redirect only on the same domain."
        {...itemProps.destinations}
      />
      <Form.Checkbox
        label="Is Internal"
        info="An alias can be restricted to receive messages only via Migadu outgoing servers. No external message would be accepted."
        {...itemProps.is_internal}
      />

      <Form.Separator />
      <Form.Description text="Alias Expiration" />
      <Form.Checkbox label="Expire alias on a date" {...itemProps.expireable} />
      <Form.DatePicker title="Expires" type={Form.DatePicker.Type.Date} {...itemProps.expires_on} />
      <Form.Checkbox label="Remove alias upon expiry" {...itemProps.remove_upon_expiry} />
    </Form>
  );
}
