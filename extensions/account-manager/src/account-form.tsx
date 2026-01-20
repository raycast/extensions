import { Action, ActionPanel, Form, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { Account } from "./types";

const generateId = () => Math.random().toString(36).substring(2, 15);

interface AccountFormProps {
  account?: Account;
  existingProjects: string[];
  existingEnvironments: string[];
  onSubmit: (account: Account) => void;
}

interface FormValues {
  projectSelect: string;
  customProject?: string;
  envSelect: string;
  customEnvironment?: string;
  role: string;
  username: string;
  password?: string;
  url?: string;
  notes?: string;
}

export default function AccountForm({ account, existingProjects, existingEnvironments, onSubmit }: AccountFormProps) {
  const { pop } = useNavigation();

  const [projectSelect, setProjectSelect] = useState<string>(
    account?.project
      ? existingProjects.includes(account.project)
        ? account.project
        : "custom"
      : existingProjects.length > 0
        ? existingProjects[0]
        : "custom",
  );

  const [envSelect, setEnvSelect] = useState<string>(
    account?.environment
      ? existingEnvironments.includes(account.environment)
        ? account.environment
        : "custom"
      : "Dev",
  );

  const [password, setPassword] = useState<string>(account?.password || "");

  const generateRandomPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setPassword(retVal);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={account ? "Update Account" : "Add Account"}
            icon={Icon.Check}
            onSubmit={(values: FormValues) => {
              const finalProject = values.projectSelect === "custom" ? values.customProject : values.projectSelect;
              const finalEnvironment = values.envSelect === "custom" ? values.customEnvironment : values.envSelect;

              onSubmit({
                id: account?.id || generateId(),
                role: values.role,
                username: values.username,
                password: values.password,
                url: values.url,
                notes: values.notes,
                project: finalProject || "",
                environment: finalEnvironment || "",
              });
              pop();
            }}
          />
          <Action
            title="Generate Password"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={generateRandomPassword}
          />
        </ActionPanel>
      }
    >
      {/* --- Project Field --- */}
      <Form.Dropdown id="projectSelect" title="Project" value={projectSelect} onChange={setProjectSelect}>
        {existingProjects.map((p) => (
          <Form.Dropdown.Item key={p} value={p} title={p} />
        ))}
        <Form.Dropdown.Item value="custom" title="Create New Project..." icon={Icon.Plus} />
      </Form.Dropdown>

      {projectSelect === "custom" && (
        <Form.TextField
          id="customProject"
          title="New Project Name"
          placeholder="e.g. E-Commerce"
          defaultValue={account?.project}
        />
      )}

      {/* --- Environment Field --- */}
      <Form.Dropdown id="envSelect" title="Environment" value={envSelect} onChange={setEnvSelect}>
        {Array.from(new Set(["Dev", "Staging", "Prod", ...existingEnvironments])).map((e) => (
          <Form.Dropdown.Item key={e} value={e} title={e} />
        ))}
        <Form.Dropdown.Item value="custom" title="Create New Environment..." icon={Icon.Plus} />
      </Form.Dropdown>

      {envSelect === "custom" && (
        <Form.TextField
          id="customEnvironment"
          title="New Environment"
          placeholder="e.g. Alpha, UAT"
          defaultValue={account?.environment}
        />
      )}

      <Form.Separator />

      <Form.TextField id="role" title="Role Name" placeholder="e.g. Admin, Buyer" defaultValue={account?.role} />

      <Form.TextField
        id="username"
        title="Username / Email"
        placeholder="user@example.com"
        defaultValue={account?.username}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Optional"
        value={password}
        onChange={setPassword}
      />
      <Form.TextField id="url" title="Login URL" placeholder="https://..." defaultValue={account?.url} />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Usage notes or testing instructions..."
        defaultValue={account?.notes}
      />
    </Form>
  );
}
