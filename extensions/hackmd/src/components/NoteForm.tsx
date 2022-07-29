import { SingleNote } from "@hackmd/api/dist/type";
import { Action, ActionPanel, Form, Icon, Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import api from "../lib/api";

const permissions = ["owner", "signed_in", "guest"];

const PermissionTitleMap: Record<string, string> = {
  owner: "Owner",
  signed_in: "Signed In",
  guest: "Guest",
};

const PermissionItems = () => (
  <>
    {permissions.map((permission) => (
      <Form.Dropdown.Item title={PermissionTitleMap[permission]} value={permission} />
    ))}
  </>
);

export default function NoteForm({
  note,
  submitTitle,
  onSubmit,
}: {
  note?: SingleNote;
  submitTitle?: string;
  onSubmit: (values: any) => void;
}) {
  const [content, setContent] = useState(note?.content);

  const [readPermission, setReadPermission] = useState(note?.readPermission || "guest");
  const [writePermission, setWritePermission] = useState(note?.writePermission || "signed_in");

  const [teamPath, setTeamPath] = useState("");

  const { data: teams, isLoading: isTeamsLoading } = usePromise(() => api.getTeams());

  return (
    <Form
      isLoading={isTeamsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={(values) => onSubmit(values)} icon={Icon.ArrowUpCircle} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="teamPath" title="Team" onChange={(path) => setTeamPath(path)} value={teamPath}>
        <Form.Dropdown.Item value="" title="My Workspace" icon={Icon.PersonCircle} />

        {teams?.map((team) => (
          <Form.Dropdown.Item
            key={team.path}
            value={team.path}
            title={team.name}
            icon={{
              source: team.logo,
              mask: Image.Mask.Circle,
            }}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="content"
        enableMarkdown
        title="Content"
        value={content}
        onChange={(value) => setContent(value)}
      />

      <Form.Dropdown
        id="readPermission"
        title="Read Permission"
        value={readPermission}
        onChange={(np) => setReadPermission(np)}
      >
        <PermissionItems />
      </Form.Dropdown>

      <Form.Dropdown
        id="writePermission"
        title="Write Permission"
        value={writePermission}
        onChange={(np) => setWritePermission(np)}
      >
        <PermissionItems />
      </Form.Dropdown>
    </Form>
  );
}
