import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { Employee } from "./entities/employee";
import { HTTPRepository } from "./repositories/httpRepository";
import { StorageRepository } from "./repositories/storageRepository";

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employee, setEmployee] = useState<Employee | undefined>();

  useEffect(() => {
    StorageRepository.getEmployee().then((emp) => {
      if (emp) {
        setEmployee(emp);
      } else {
        HTTPRepository.GetEmployees().then((empList) => setEmployees(empList));
      }
    });
  }, []);

  function renderEmployeeList(empList: Employee[]) {
    return (
      <List.Section title="Сотрудники">
        {empList.map((emp) => (
          <List.Item
            key={emp.id}
            title={emp.username}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Person}
                  title="Choose User"
                  onAction={() => StorageRepository.setEmployee(emp).then(() => setEmployee(emp))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List onSearchTextChange={(value) => setInput(value)} searchText={input}>
      {employee ? renderEmployeeList([employee]) : renderEmployeeList(employees)}
    </List>
  );
}
