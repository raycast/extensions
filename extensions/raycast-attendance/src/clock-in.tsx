import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import ky from "ky";
import type { AttendanceType } from "@raycast-attendance/shared";

interface Preferences {
  apiUrl: string;
  apiKey: string;
}

function createApiClient() {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  return ky.create({
    prefixUrl: apiUrl,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

async function recordAttendance(type: AttendanceType): Promise<void> {
  const api = createApiClient();
  await api.post("api/attendance", {
    json: {
      type,
      timestamp: new Date().toISOString(),
    },
  });
}

const LABELS: Record<AttendanceType, string> = {
  "clock-in": "出勤",
  "clock-out": "退勤",
  "break-start": "休憩開始",
  "break-end": "休憩終了",
};

export async function recordAndNotify(type: AttendanceType): Promise<void> {
  const label = LABELS[type];
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `${label}を記録中...`,
    });
    await recordAttendance(type);
    await showToast({
      style: Toast.Style.Success,
      title: `${label}を記録しました`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${label}の記録に失敗`,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default async function Command() {
  await recordAndNotify("clock-in");
}
