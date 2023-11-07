import { Form, getPreferenceValues, Toast, showToast, Action, ActionPanel, useNavigation } from "@raycast/api";
import { userInfo } from "os";
import { exec } from "child_process";
import { Preferences } from "./utils";

const preferences = getPreferenceValues<Preferences>();
const options: any = {
  env: { PATH: preferences.path_var },
  ...process.env,
  ...userInfo(),
};

interface CreatingPassValues {
  path?: string;
  password?: string;
  custom_fields?: string;
}

export default function CreatePassForm() {
  const { pop } = useNavigation();

  const AddPASS = async (values: CreatingPassValues) => {
    let command = "";

    // Generate password without custom fields
    if (!values.password && !values.custom_fields) {
      command = `pass generate '${values.path}'`;
    }

    // Generate password and use custom fields
    if (!values.password && values.custom_fields) {
      command = `export password=$(openssl rand -base64 12) && pass insert -m '${values.path}' << EOF\n$password\n${values.custom_fields}\nEOF`;
    }

    // Use only password
    if (values.password && !values.custom_fields) {
      command = `echo '${values.password}' | pass insert -e '${values.path}'`;
    }

    // Use password and custom fields
    if (values.password && values.custom_fields) {
      command = `pass insert -m '${values.path}' << EOF\n${values.password}\n${values.custom_fields}\nEOF`;
    }

    const cmd = exec(command, options);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding Pass Entry",
    });

    cmd.stdout!.on("data", async () => {
      toast.style = Toast.Style.Success;
      toast.title = `Created Pass Entry ${values.path}`;
      pop();
    });

    cmd.on("close", (code) => {
      if (code != 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create Pass Entry";
      }
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: CreatingPassValues) => {
              AddPASS(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Create Password" text={"Create new password"} />
      <Form.TextField id="path" title="File path" />
      <Form.PasswordField id="password" placeholder="If empty, password will be generated" title="Password" />
      <Form.TextArea
        id="custom_fields"
        title="Custom Fields"
        placeholder="login:my_login
my_field:my_field_value"
      />
    </Form>
  );
}
