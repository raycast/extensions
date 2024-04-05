import axios from "axios";
import { getPreferenceValues, popToRoot, showHUD, showToast, Toast } from "@raycast/api";

const URL = "https://api.personio.de/v1";

// this function uses the secrets to get a short-lived (one day) token
export async function getPersonioToken() {
  const url = URL + "/auth";
  const payload = {
    client_secret: getPreferenceValues().clientSecret,
    client_id: getPreferenceValues().clientId,
  };

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  const res = await axios.post(url, payload, { headers });
  const data = res.data;
  const token = data.data.token;
  return token;
}

export async function addTime(
  employeeNumber: number,
  date: string,
  start_time: string,
  end_time: string,
  break_time: number,
  token: string,
) {
  const url = "https://api.personio.de/v1/company/attendances";

  const payload = {
    attendances: [
      {
        employee: employeeNumber,
        date: date,
        start_time: start_time,
        end_time: end_time,
        break: break_time,
      },
    ],
  };

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    authorization: "Bearer " + token,
  };

  try {
    axios.post(url, payload, { headers });
    await showHUD("Time Tracked 🎉");
    popToRoot();
  } catch (error) {
    if (axios.isAxiosError(error) && error.stack) {
      if (error.stack.includes("IncomingMessage.handleStreamEnd")) {
        console.log("Caught the specific error: IncomingMessage.handleStreamEnd");
        await showToast({ style: Toast.Style.Failure, title: "That didn't work!" });
      } else {
        // Handle other errors
        console.log("Some other Axios error occurred", error);
      }
    } else {
      console.log("An error occurred that is not an Axios error", error);
    }
  }
}
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
export async function getEmployees(token: string): Promise<Employee[]> {
  const url = URL + "/company/employees";
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
    await showToast({ style: Toast.Style.Failure, title: "That didn't work!", message: "Unfortunate!" });
    return [];
  }
}

export interface AttendancePeriodJSON {
  id: number;
  type: string;
  attributes: {
    employee: number;
    date: string;
    start_time: string;
    end_time: string;
    break: number;
    comment: string;
    updated_at: string;
    status: string;
    project: number;
    is_holiday: boolean;
    is_on_time_off: boolean;
  };
}

export interface AttendancePeriod {
  id: number;
  employee: number;
  date: string;
  start_time: string;
  end_time: string;
  break: number;
  comment: string;
  updated_at: string;
  status: string;
  project: number;
  is_holiday: boolean;
  is_on_time_off: boolean;
}

export async function getAttendances(employeeNumber: number, token: string): Promise<AttendancePeriod[]> {
  const url =
    URL +
    "/company/attendances?employees[]=" +
    employeeNumber +
    "&start_date=2024-01-01&end_date=2024-12-31&includePending=true";
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  try {
    const res = await axios.get(url, { headers });
    const data = res.data.data as AttendancePeriodJSON[];
    const attendances = data.map((a) => ({
      id: a.id,
      employee: a.attributes.employee,
      date: a.attributes.date,
      start_time: a.attributes.start_time,
      end_time: a.attributes.end_time,
      break: a.attributes.break,
      comment: a.attributes.comment,
      updated_at: a.attributes.updated_at,
      status: a.attributes.status,
      project: a.attributes.project,
      is_holiday: a.attributes.is_holiday,
      is_on_time_off: a.attributes.is_on_time_off,
    }));
    await showToast({
      title: "Loaded Attendances",
      message: `${attendances.length} Attendances in 2024 loaded successfully!`,
    });
    return attendances;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "That didn't work!", message: "Unfortunate!" });
    return [];
  }
}

export async function getEmployeeInfo(id: number, token: string) {
  const url = URL + "/company/employees/" + id;
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  const res = await axios.get(url, { headers });
  const data = res.data;
  return data.data.attributes.preferred_name.value;
}
