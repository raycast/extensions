import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Employee, getEmployees, getPersonioToken } from "./api";

export default function GetEmployeeNumber() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    async function fetchEmployees() {
      const token = await getPersonioToken();
      const employees = await getEmployees(token);
      setEmployees(employees);
    }
    fetchEmployees();
  }, []);

  if (employees.length === 0) {
    return <List isLoading={true} />;
  } else {
    return (
      <List>
        {employees.map((employee) => (
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
}
