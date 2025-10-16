import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import { BASE_URL, getPersonioToken } from "./api";
import { cache } from "./cache";

// the JSON structure returned by the personio API
export interface EmployeeJSON {
  type: string;
  attributes: {
    id: {
      label: string;
      value: number;
      type: string;
      universal_id: string;
    };
    preferred_name: {
      label: string;
      value: string;
      type: string;
      universal_id: string;
    };
  };
}

export interface Employee {
  id: number;
  name: string;
}

// Get a list of employees (this can be used to find your own personio employee number)
export async function getEmployeesAPI(token: string): Promise<Employee[]> {
  const url = BASE_URL + "/company/employees";
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  try {
    const res = await axios.get(url, { headers });
    const data = res.data.data as EmployeeJSON[];
    // convert the JSON data to Employee objects
    const employees = data.map((e) => ({ id: e.attributes.id.value, name: e.attributes.preferred_name?.value }));
    await showToast({ title: "Employees loaded", message: `${employees.length} Loaded employees successfully!` });
    return employees;
  } catch (error) {
    console.error(error);
    await showToast({ style: Toast.Style.Failure, title: "That didn't work!", message: "Couldn't load employees!" });
    return [];
  }
}

export async function getEmployees() {
  const token = await getPersonioToken();
  const employees = cache.get("employees");
  if (employees) {
    return JSON.parse(employees) as Employee[];
  } else {
    const employees = await getEmployeesAPI(token);
    cache.set("employees", JSON.stringify(employees), 100000);
    return employees;
  }
}
