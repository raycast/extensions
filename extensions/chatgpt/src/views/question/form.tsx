import { Form } from "@raycast/api";
import { useState } from "react";

export default function ChatForm({
                                   isLoading,
                                   api
                                 }: {
  isLoading: boolean,
  api?: Awaited<ReturnType<typeof useAPI>>
}) {
   const [workspaceId, setWorkspaceId] = useState<string>("");
  const [workspaces, setWorkspaces] = useState<WorkSpace[]>([]);
  const [bots, setBots] = useState<SimpleBot[]>([]);

  const [nameError, setNameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();


  useEffect(() => {
    (async () => {
      if (!api) return;
      const data = await api.listAllWorkspaces();
      data && setWorkspaces(data.items);
    })();
  }, [api]);

  useEffect(() => {
    (async () => {
      if (!api || !workspaceId) return;
      const data = await api.listAllBots({
        space_id: workspaceId,
      });
      data && setBots(data.items);
    })();
  }, [workspaceId]);

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropPasswordErrorIfNeeded() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  return (
    <Form isLoading={isLoading}>
    <Form.Dropdown
        title="Workspace ID"
        placeholder="Input your workspace ID here"
        onChange={(value) => {
          console.log('workspaceId changed', value);
          setWorkspaceId(value);
        }}
        
        {...itemProps.workspace_id}
      >
        {workspaces.map((workspace: WorkSpace) => (
          <Form.Dropdown.Item
            key={workspace.id}
            value={workspace.id}
            title={workspace.name}
            icon={workspace.icon_url}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Bot ID"
        placeholder="Input your bot ID here"
        {...itemProps.bot_id}
      >
        {bots.map((bot: SimpleBot) => (
          <Form.Dropdown.Item
            key={bot.bot_id}
            value={bot.bot_id}
            title={bot.bot_name}
            icon={bot.icon_url}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="nameField"
        title="Full Name"
        placeholder="Tim Cook"
        error={nameError}
        onChange={(val)=>{
          console.log('val', val)
          dropNameErrorIfNeeded()
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.PasswordField
        id="password"
        title="New Password"
        error={passwordError}
        onChange={(val)=>{
            console.log('val', val)
            dropPasswordErrorIfNeeded
        }}
        onBlur={(event) => {
          console.log('onBlur', event.target);
          
          const value = event.target.value;
          if (value && value.length > 0) {
            if (!validatePassword(value)) {
              setPasswordError("Password should be at least 8 characters!");
            } else {
              dropPasswordErrorIfNeeded();
            }
          } else {
            setPasswordError("The field should't be empty!");
          }
        }}
      />
      <Form.TextArea id="bioTextArea" title="Add Bio" placeholder="Describe who you are" />
      <Form.DatePicker id="birthDate" title="Date of Birth" />
    </Form>
  );
}

function validatePassword(value: string): boolean {
  return value.length >= 8;
}