import { List } from "@raycast/api";
import { useEffect, useState } from "react";

import { Employee, getEmployees } from "./api/employee";
import { isAuthenticated } from "./api/api";
import { EmployeeNumberList } from "./components/EmployeeNumberList";

export default function GetEmployeeNumberCommand() {
  const [employees, setEmployees] = useState<Employee[] | undefined>(undefined);
  const [isAuth, setIsAuth] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    async function fetchEmployees() {
      const isAuth_ = await isAuthenticated();
      setIsAuth(isAuth_);
      if (!isAuth_) {
        return;
      }
      const employees = await getEmployees();
      setEmployees(employees);
    }
    fetchEmployees();
  }, []);

  const isLoading = !employees;

  if (isAuth === undefined) {
    return <List isLoading={true} />;
  } else if (isAuth) {
    if (!isLoading) {
      return <EmployeeNumberList employees={employees} />;
    } else {
      return <List isLoading={true} />;
    }
  } else {
    return <List />;
  }
}
