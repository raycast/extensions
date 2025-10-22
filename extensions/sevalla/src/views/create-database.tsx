import { useNavigation, showToast, Toast, Form, ActionPanel, Action } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { DATABASE_TYPES, DATABASE_LOCATIONS, DATABASE_RESOURCE_TYPES } from "../config";
import { makeRequest } from "../sevalla";

export default function CreateDatabase() {
  const { pop } = useNavigation();
  type FormValues = {
    type: string;
    version: string;
    db_name: string;
    db_user?: string;
    db_password: string;
    display_name: string;
    location: string;
    resource_type: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.display_name);
      try {
        await makeRequest<{ database: { id: string } }>("databases", {
          method: "POST",
          body: {
            ...values,
            type: values.type.toLowerCase(),
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      type: "PostgreSQL",
      resource_type: "db1",
    },
    validation: {
      type: FormValidation.Required,
      version: FormValidation.Required,
      db_name: FormValidation.Required,
      db_user(value) {
        if (values.type !== "Redis" && !value) return "The item is required";
      },
      db_password(value) {
        if (!value) return "The item is required";
        if (value.length < 4) return "The item is too short";
      },
      display_name: FormValidation.Required,
      location: FormValidation.Required,
      resource_type: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Database Details" />
      <Form.Dropdown title="" {...itemProps.type}>
        {Object.keys(DATABASE_TYPES).map((type) => (
          <Form.Dropdown.Item key={type} icon={`${type.toLowerCase()}.svg`} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title={`${values.type} version`} {...itemProps.version}>
        {Object.values(DATABASE_TYPES[values.type]).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Database Name" {...itemProps.db_name} />
      {values.type !== "Redis" && <Form.TextField title="Database User" {...itemProps.db_user} />}
      <Form.PasswordField title="Database Password" {...itemProps.db_password} />
      <Form.Separator />

      <Form.TextField
        title="Name"
        placeholder="my-database"
        info="Helps you identify your database."
        {...itemProps.display_name}
      />
      <Form.Separator />
      <Form.Dropdown
        title="Location"
        info="Choose from 25 data center locations, which allows you to place your database in a geographical location closest to your visitors."
        {...itemProps.location}
      >
        {Object.entries(DATABASE_LOCATIONS).map(([section, vals]) => (
          <Form.Dropdown.Section key={section} title={section}>
            {vals.map((val) => (
              <Form.Dropdown.Item key={val[0]} title={`${val[0]} (${val[1]})`} value={val[1]} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown title="Resources" info="Resource size cannot be downgraded later on." {...itemProps.resource_type}>
        {Object.entries(DATABASE_RESOURCE_TYPES).map(([key, val]) => (
          <Form.Dropdown.Item key={key} title={`${key} (${val.resources} / ${val.size})`} value={key} />
        ))}
      </Form.Dropdown>
      <Form.Description title="Cost" text={DATABASE_RESOURCE_TYPES[values.resource_type].cost} />
    </Form>
  );
}
