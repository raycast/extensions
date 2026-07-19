import { LocalStorage, showToast, Toast } from "@raycast/api";

const ALERTS_KEY = "ticktick_pending_alerts";

export type AlertType = "pomodoro_complete" | "pomodoro_break" | "overdue" | "urgent";

export interface PendingAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  createdAt: number;
}

export async function getPendingAlerts(): Promise<PendingAlert[]> {
  const raw = await LocalStorage.getItem<string>(ALERTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingAlert[];
  } catch {
    return [];
  }
}

export async function pushAlert(alert: Omit<PendingAlert, "id" | "createdAt">): Promise<void> {
  const existing = await getPendingAlerts();
  const next: PendingAlert[] = [
    ...existing,
    { ...alert, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() },
  ];
  // Keep last 10 alerts max
  await LocalStorage.setItem(ALERTS_KEY, JSON.stringify(next.slice(-10)));
}

export async function clearAlerts(): Promise<void> {
  await LocalStorage.removeItem(ALERTS_KEY);
}

const STYLE: Record<AlertType, Toast.Style> = {
  pomodoro_complete: Toast.Style.Success,
  pomodoro_break: Toast.Style.Animated,
  overdue: Toast.Style.Failure,
  urgent: Toast.Style.Failure,
};

/** Show any queued alerts as Raycast toasts (best-effort — requires Raycast to be open). */
export async function flushPendingAlerts(): Promise<void> {
  const alerts = await getPendingAlerts();
  if (alerts.length === 0) return;

  for (const alert of alerts) {
    await showToast({
      style: STYLE[alert.type] ?? Toast.Style.Animated,
      title: alert.title,
      message: alert.message,
    });
  }
  await clearAlerts();
}
