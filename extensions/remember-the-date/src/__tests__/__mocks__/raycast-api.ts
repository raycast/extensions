export const LaunchType = { Background: "background", UserInitiated: "userInitiated" };
export const Toast = { Style: { Failure: "failure", Success: "success" } };
export const Icon = { Calendar: "calendar" };
export const Color = { Blue: "blue" };
export function launchCommand() {
  return Promise.resolve();
}
export function showToast() {
  return Promise.resolve();
}
