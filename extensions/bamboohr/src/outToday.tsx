import { List, updateCommandMetadata } from "@raycast/api";
import { getTodayDate } from "./utils/date";
import { bamboo } from "./utils/bambooData";
import { EmployeeType } from "./utils/types";
import Employee from "./employee";

export default function Command() {
  interface allTimeOffResponse {
    isLoading: boolean;
    data: {
      id: string;
      type: string;
      employeeId: string;
      name: string;
      start: string;
      end: string;
    }[];
  }

  interface timeOffResponse {
    id: string;
    type: string;
    employeeId: string;
    name: string;
    start: string;
    end: string;
  }

  interface allEmployeesResponse {
    isLoading: boolean;
    data: {
      employees: EmployeeType[];
      fields: {
        id: string;
        type: string;
        name: string;
      }[];
    } | null;
  }

  // get all data from bambooHR
  const allEmployees = bamboo(`employees/directory`) as allEmployeesResponse;
  const offToday = bamboo(`time_off/whos_out?end=${getTodayDate()}`) as allTimeOffResponse;

  // select employee from
  function getEmployee(employeeId: string) {
    return allEmployees?.data?.employees.find((employee: EmployeeType) => employee.id === employeeId);
  }

  // update subtitle of command
  if (!offToday.isLoading) {
    const outToday =
      offToday?.data?.map((item: timeOffResponse) => item.name.split(" ")[0]).join(", ") || "Nobody is out today";
    updateCommandMetadata({ subtitle: outToday });
  }

  // return the actual command output
  return (
    <List isShowingDetail isLoading={allEmployees.isLoading}>
      {offToday?.data?.map((item: timeOffResponse) => (
        <Employee key={item.id} subtitle={`${item.end}`} employee={getEmployee(item.employeeId.toString())} />
      ))}
    </List>
  );
}
