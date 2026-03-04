import { vi } from "vitest";

export const showToast = vi.fn();
export const Toast = { Style: { Success: "success", Failure: "failure" } };
export const Icon = {};
export const Action = {};
export const ActionPanel = {};
export const Form = {};
export const Grid = {};
export const Alert = { ActionStyle: { Destructive: "destructive" } };
export const confirmAlert = vi.fn();
export const open = vi.fn();
export const useNavigation = vi.fn(() => ({ pop: vi.fn() }));
export const getApplications = vi.fn();
export const getPreferenceValues = vi.fn(() => ({}));
export const environment = { supportPath: "/tmp/test-support" };
