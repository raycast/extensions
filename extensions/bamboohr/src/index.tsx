import { List, updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { bamboo } from "./utils/bambooData";
import Employee from "./employee";
import { EmployeeType } from "./utils/types";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
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

  // select employee from returned directory
  function getEmployee(employeeId: string) {
    return allEmployees?.data?.employees.find((employee) => employee.id === employeeId);
  }

  // update subtitle of command
  if (!allEmployees.isLoading) {
    updateCommandMetadata({
      subtitle: `${preferences.bamboo_subdomain}: ${allEmployees?.data?.employees.length} employees`,
    });
  }

  // return the actual command output
  if (allEmployees?.data?.employees) {
    return (
      <List isShowingDetail isLoading={allEmployees.isLoading}>
        {allEmployees?.data.employees?.map((item) => (
          <Employee key={item.id} subtitle={item.jobTitle} employee={getEmployee(item.id.toString())} />
        ))}
      </List>
    );
  }
}
