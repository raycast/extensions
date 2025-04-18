import { Action, ActionPanel, Application, Form, getApplications, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

export default function NewOpenable(props: {
  onSave: (newName: string, path: string, type: "website" | "directory", opener: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"website" | "directory">("website");
  const [path, setPath] = useState("");
  const [opener, setOpener] = useState<string | null>(null);
  const [openers, setOpeners] = useState<Application[]>([]);
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={() => {
              props.onSave(name, path, type, opener);
              showToast({
                style: Toast.Style.Success,
                title: `Added ${name} to list of ${type}s!`,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" onChange={(value) => setType(value as "website" | "directory")}>
        <Form.Dropdown.Item value="website" title="Website" />
        <Form.Dropdown.Item value="directory" title="Directory" />
      </Form.Dropdown>

      <Form.Separator />

      {type === "website" && (
        <>
          <Form.Description text="Add a website to the list of things you can open" />
          <Form.TextField
            id="name"
            title="Default Name of Website"
            value={name}
            onChange={setName}
            placeholder="Youtube"
            autoFocus
          />
          <Form.TextField id="path" title="Path" value={path} onChange={setPath} placeholder="https://youtube.com" />
        </>
      )}

      {type === "directory" && (
        <>
          <Form.Description text="Add a system directory to the list of things you can open" />
          <Form.TextField
            id="name"
            title="Default Name of Directory"
            value={name}
            onChange={setName}
            placeholder="Youtube"
            autoFocus
          />
          <Form.FilePicker
            id="path"
            title="Path to Directory"
            canChooseDirectories
            onChange={async (newValue) => {
              setPath(newValue[0]);
              setOpeners(await getApplications(newValue[0]));
            }}
            allowMultipleSelection={false}
          />
          {path !== "" && (
            <Form.Dropdown
              id="opener"
              title="Opener"
              onChange={(value) => setOpener(openers.find((o) => o.name === value)?.name ?? "")}
            >
              {openers.map((opener) => (
                <Form.Dropdown.Item key={opener.bundleId} value={opener.name} title={opener.name} />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}
