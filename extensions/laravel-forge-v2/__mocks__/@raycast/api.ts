import { vi } from "vitest";

export const LaunchType = { Background: "background" };
export const environment = { launchType: "normal" };
export const showToast = vi.fn();
export const popToRoot = vi.fn();
export const LocalStorage = { clear: vi.fn() };
export const Toast = { Style: { Failure: "failure", Success: "success" } };
