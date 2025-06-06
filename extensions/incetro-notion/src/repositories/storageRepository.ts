import { LocalStorage } from "@raycast/api";
import { Employee } from "../entities/employee";

export class StorageRepository {
  static getEmployee = async (): Promise<Employee | undefined> => {
    const employee = await LocalStorage.getItem("employee");
    if (employee == undefined) return undefined;
    return JSON.parse(employee.toString());
  };

  static setEmployee = async (employee: Employee) => {
    await LocalStorage.setItem("employee", JSON.stringify(employee));
  };

  static removeEmployee = async () => {
    await LocalStorage.removeItem("employee");
  };
}
