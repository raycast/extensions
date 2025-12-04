import { Action, ActionPanel, List } from "@raycast/api";
import { Employee } from "../api/employee";

export function EmployeeNumberList(props: { employees: Employee[] }) {
  return (
    <List>
      {props.employees.map((employee) => (
        <List.Item
          key={employee.id}
          title={employee.name || ""}
          subtitle={employee.id.toString()}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Employee Number" content={employee.id.toString()} />
              <Action.Paste title="Paste Employee Number" content={employee.id.toString()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
