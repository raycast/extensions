import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { People } from "./api/resources";
import { useCompanies } from "./hooks/useLookups";
import { showKyoError } from "./lib/helpers";
import { LogOutAction } from "./components/AuthActions";

interface PersonFormValues {
  name: string;
  email: string;
  phone: string;
  position: string;
  company_id: string;
  linkedin_url: string;
  twitter_url: string;
}

export default function CreatePerson() {
  const { pop } = useNavigation();
  const { data: companies, isLoading } = useCompanies();

  async function submit(values: PersonFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    try {
      const person = await People.create({
        name: values.name.trim(),
        email: values.email || undefined,
        phone: values.phone || undefined,
        position: values.position || undefined,
        company_id: values.company_id || undefined,
        linkedin_url: values.linkedin_url || undefined,
        twitter_url: values.twitter_url || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Person created",
        message: person.name,
      });
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create person");
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Person"
            icon={Icon.Plus}
            onSubmit={submit}
          />
          <LogOutAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Jane Doe" />
      <Form.TextField id="email" title="Email" placeholder="jane@acme.com" />
      <Form.TextField id="phone" title="Phone" placeholder="+1 555 000 1111" />
      <Form.TextField
        id="position"
        title="Position"
        placeholder="Head of Growth"
      />
      <Form.Dropdown id="company_id" title="Company">
        <Form.Dropdown.Item value="" title="None" />
        {companies.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="linkedin_url"
        title="LinkedIn"
        placeholder="https://linkedin.com/in/…"
      />
      <Form.TextField
        id="twitter_url"
        title="Twitter"
        placeholder="https://x.com/…"
      />
    </Form>
  );
}
