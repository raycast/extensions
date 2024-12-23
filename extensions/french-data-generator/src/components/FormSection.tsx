import { Form, ActionPanel, Action, List } from "@raycast/api";

type FormSectionProps = {
  dob: string | undefined;
  setDob: (dob: string) => void;
  regenerateData: () => void;
};

export function FormSection({ dob, setDob, regenerateData }: FormSectionProps) {
  return (
    <List.Section title="Paramètres">
      <Form.TextField id="dob" title="Date de naissance" placeholder="YYYY-MM-DD" value={dob} onChange={setDob} />
      <ActionPanel>
        <Action title="Régénérer Les Données" onAction={regenerateData} />
      </ActionPanel>
    </List.Section>
  );
}
