import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { People } from "../api/resources";
import type { Person } from "../api/types";
import { useCompanies } from "../hooks/useLookups";
import { showKyoError } from "../lib/helpers";

export function EditPersonForm({
  person,
  onSaved,
}: {
  person: Person;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const { data: companies } = useCompanies();

  async function submit(values: {
    name: string;
    email: string;
    phone: string;
    position: string;
    company_id: string;
    linkedin_url: string;
    twitter_url: string;
  }) {
    try {
      // PATCH semantics: null CLEARS a field, undefined leaves it untouched.
      await People.update(person.id, {
        name: values.name.trim(),
        email: values.email || null,
        phone: values.phone || null,
        position: values.position || null,
        company_id: values.company_id || null,
        linkedin_url: values.linkedin_url || null,
        twitter_url: values.twitter_url || null,
      });
      await showToast({ style: Toast.Style.Success, title: "Person updated" });
      onSaved?.();
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to update person");
    }
  }

  return (
    <Form
      navigationTitle={`Edit · ${person.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={person.name} />
      <Form.TextField
        id="email"
        title="Email"
        defaultValue={person.email ?? ""}
      />
      <Form.TextField
        id="phone"
        title="Phone"
        defaultValue={person.phone ?? ""}
      />
      <Form.TextField
        id="position"
        title="Position"
        defaultValue={person.position ?? ""}
      />
      <Form.Dropdown
        id="company_id"
        title="Company"
        defaultValue={person.company_id ?? ""}
      >
        <Form.Dropdown.Item value="" title="None" />
        {companies.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="linkedin_url"
        title="LinkedIn"
        defaultValue={person.linkedin_url ?? ""}
      />
      <Form.TextField
        id="twitter_url"
        title="Twitter"
        defaultValue={person.twitter_url ?? ""}
      />
    </Form>
  );
}
