import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import { cache } from "./cache";
import { BASE_URL } from "./api";

interface AttendancePeriodJSON {
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

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export async function getAttendancesAPI(
  employeeNumber: number,
  token: string,
  currentYear: string,
  selectedMonth: string,
): Promise<AttendancePeriod[]> {
  const maxDays = daysInMonth(parseInt(currentYear), parseInt(selectedMonth));

  const url =
    BASE_URL +
    "/company/attendances?employees[]=" +
    employeeNumber +
    `&start_date=${currentYear}-${selectedMonth}-01&end_date=${currentYear}-${selectedMonth}-${maxDays}&includePending=true`;
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
    console.error(error);
    return [];
  }
}

export async function getAttendances(
  employeeNumber: number,
  token: string,
  currentYear: string,
  selectedMonth: string,
) {
  const key = employeeNumber.toString() + currentYear + selectedMonth;
  const attendances = cache.get(key);

  if (attendances) {
    return JSON.parse(attendances) as AttendancePeriod[];
  } else {
    const attendances = await getAttendancesAPI(employeeNumber, token, currentYear, selectedMonth);
    cache.set(key, JSON.stringify(attendances), 23 * 60);
    return attendances;
  }
}
