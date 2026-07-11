const storage = new Map<string, string | number | boolean>();

export const LocalStorage = {
  getItem: async <T>(key: string): Promise<T | undefined> => storage.get(key) as T | undefined,
  setItem: async (key: string, value: string | number | boolean): Promise<void> => {
    storage.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    storage.delete(key);
  },
  clear: async (): Promise<void> => storage.clear(),
};

export function getPreferenceValues<T>(): T {
  return {
    apiToken: "test-token",
    reportingApiToken: "reporting-test-token",
    auditApiToken: "audit-test-token",
    ciJobs: "Example Sandbox|11111111-1111-4111-8111-111111111111|sandbox",
    pipelineId: "33333333-3333-4333-8333-333333333333",
    historyDays: "30",
    historyLimit: "100",
    deploymentHistoryDays: "30",
  } as T;
}

export const Action = {};
export const ActionPanel = {};
export const Alert = { ActionStyle: { Destructive: "destructive" } };
export const Color = { Green: "green", Red: "red", Orange: "orange", SecondaryText: "secondary" };
export const Detail = {};
export const Form = {};
export const Icon = {
  CheckCircle: "check",
  XMarkCircle: "x",
  Clock: "clock",
  Circle: "circle",
};
export const List = {};
export const Toast = { Style: { Animated: "animated", Success: "success", Failure: "failure" } };
export const confirmAlert = async () => true;
export const openExtensionPreferences = async () => undefined;
export const showToast = async () => ({ style: "", title: "", message: "" });
export const useNavigation = () => ({ push: () => undefined, pop: () => undefined });
