import { List, ActionPanel, Action } from "@raycast/api";

type GeneratedListProps = {
  name: string;
  ssn: string;
  iban: string;
  bic: string;
};

export function GeneratedList({ name, ssn, iban, bic }: GeneratedListProps) {
  return (
    <List.Section title="Informations Générées">
      <List.Item
        title="Nom et Prénom"
        subtitle={name}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={name} title="Copier Nom & Prénom" />
          </ActionPanel>
        }
      />
      <List.Item
        title="Numéro de Sécurité Sociale"
        subtitle={ssn}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={ssn} title="Copier Ssn" />
          </ActionPanel>
        }
      />
      <List.Item
        title="IBAN"
        subtitle={iban}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={iban} title="Copier Iban" />
          </ActionPanel>
        }
      />
      <List.Item
        title="BIC"
        subtitle={bic}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={bic} title="Copier Bic" />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
