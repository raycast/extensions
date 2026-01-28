import { useCallback, useState } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { PortalType } from "../types";
import { portalTypeIcons } from "../utils";

function CreatePortalForm(props: {
  defaultPortalName?: string;
  onCreate: (portalName: string, portalId: string, portalType: PortalType) => void;
}) {
  const { onCreate, defaultPortalName = "" } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { portalName: string; portalId: string; portalType: PortalType }) => {
      onCreate(values.portalName, values.portalId, values.portalType);
      pop();
    },
    [onCreate, pop]
  );

  const [nameError, setPortalNameError] = useState<string | undefined>();
  const [idError, setPortalIdError] = useState<string | undefined>();

  function dropPortalNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setPortalNameError(undefined);
    }
  }
  function dropPortalIdErrorIfNeeded() {
    if (idError && idError.length > 0) {
      setPortalIdError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Portal" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="portalName"
        defaultValue={defaultPortalName}
        title="Portal Name"
        placeholder="Sterling Cooper"
        error={nameError}
        onChange={dropPortalNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPortalNameError("This field is required!");
          } else {
            dropPortalNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="portalId"
        title="Portal ID"
        placeholder="12345678"
        error={idError}
        onChange={dropPortalIdErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPortalIdError("This field is required!");
          } else if (!/^\d+$/.test(event.target.value?.trim() ?? "")) {
            setPortalIdError("Portal ID must be a number!");
          } else {
            dropPortalIdErrorIfNeeded();
          }
        }}
      />
      <Form.Dropdown id="portalType" defaultValue={PortalType.Prod} title="Portal Type">
        <Form.Dropdown.Item value={PortalType.Prod} title={PortalType.Prod} icon={portalTypeIcons.Production} />
        <Form.Dropdown.Item value={PortalType.Sandbox} title={PortalType.Sandbox} icon={portalTypeIcons.Sandbox} />
        <Form.Dropdown.Item
          value={PortalType.CMSSandbox}
          title={PortalType.CMSSandbox}
          icon={portalTypeIcons["CMS Sandbox"]}
        />
        <Form.Dropdown.Item value={PortalType.Dev} title={PortalType.Dev} icon={portalTypeIcons.Dev} />
        <Form.Dropdown.Item value={PortalType.Test} title={PortalType.Test} icon={portalTypeIcons.Test} />
      </Form.Dropdown>
    </Form>
  );
}

export default CreatePortalForm;
