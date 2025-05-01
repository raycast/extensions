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
    if (employee === undefined) {
      StorageRepository.getEmployee().then((emp) => {
        if (emp) {
          setEmployee(emp);
        } else {
          HTTPRepository.GetEmployees().then((empList) => setEmployees(empList));
        }
      });
    }
  }, [employee]); // добавили зависимость

  function renderEmployeeList(empList: Employee[]) {
    return (
      <List.Section title="Сотрудники">
        {empList
          .filter((emp) => emp.username.toLowerCase().includes(input))
          .map((emp) => (
            <List.Item
              key={emp.id}
              title={emp.username}
              actions={
                <ActionPanel>
                  {emp.id === employee?.id ? (
                    <Action
                      icon={Icon.Trash}
                      title="Unpick User"
                      onAction={() => StorageRepository.removeEmployee().then(() => setEmployee(undefined))}
                    />
                  ) : (
                    <Action
                      icon={Icon.Person}
                      title="Choose User"
                      onAction={() => StorageRepository.setEmployee(emp).then(() => setEmployee(emp))}
                    />
                  )}
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
