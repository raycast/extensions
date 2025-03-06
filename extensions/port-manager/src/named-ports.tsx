import { ActionPanel, List } from "@raycast/api";
import { CreateNamedPortAction } from "./actions/CreateNamedPortAction";
import { DeleteNamedPortAction } from "./actions/DeleteNamedPortAction";
import { EditNamedPortAction } from "./actions/EditNamedPortAction";
import { useNamedPorts } from "./hooks/useNamedPorts";

function EditNamedPortsCommand() {
  const { allNamedPorts } = useNamedPorts();

  return (
    <List>
      <List.EmptyView
        title="No Named Ports"
        description="Name ports to make them easier to find in the open port list"
        actions={
          <ActionPanel>
            <CreateNamedPortAction />
          </ActionPanel>
        }
      />
      {allNamedPorts.map(([port, namedPortInfo]) => (
        <List.Item
          key={port}
          title={namedPortInfo.name}
          subtitle={port.toString()}
          actions={
            <ActionPanel>
              <EditNamedPortAction port={port} />
              <DeleteNamedPortAction port={port} />
              <ActionPanel.Section>
                <CreateNamedPortAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default EditNamedPortsCommand;
