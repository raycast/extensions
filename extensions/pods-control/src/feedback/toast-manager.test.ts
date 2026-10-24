import { Clipboard, closeMainWindow, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { ToastManager, type ToastTitles } from "./toast-manager";

const mockClipboardCopy = vi.mocked(Clipboard.copy);

const mockCloseMainWindow = vi.mocked(closeMainWindow);

const mockShowHUD = vi.mocked(showHUD);

const mockShowToast = vi.mocked(showToast);

const titles: ToastTitles = {
  loading: "Setting to Transparency...",
  success: "Set to Transparency ○",
  failure: "Failed to set Transparency",
};

function makeMockToast(overrides: Partial<Toast> = {}) {
  return {
    style: Toast.Style.Animated,
    title: "Loading...",
    message: undefined,
    primaryAction: undefined,
    secondaryAction: undefined,
    hide: vi.fn(async () => {}),
    show: vi.fn(async () => {}),
    id: "test-id",
    options: {},
    callbacks: {},
    ...overrides,
  };
}

test("shows progress without closing the Raycast window", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToLoading();
  // Then
  expect(mockShowToast).toHaveBeenCalledWith({
    style: Toast.Style.Animated,
    title: titles.loading,
  });
  expect(mockCloseMainWindow).not.toHaveBeenCalled();
  expect(mockShowHUD).not.toHaveBeenCalled();
});

test("supports loading title overrides and suffixes", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToLoading({ titleOverride: "Custom loading title", titleSuffix: "Device 1" });
  // Then
  expect(mockShowToast).toHaveBeenCalledWith({
    style: Toast.Style.Animated,
    title: "Custom loading title - Device 1",
  });
});

test("clears failure details and reuses the toast when an operation is retried", async () => {
  // Given
  const toast = makeMockToast();
  mockShowToast.mockResolvedValueOnce(toast as unknown as Toast);
  const manager = new ToastManager(titles);
  const recovery = { title: "Retry", onAction: vi.fn() };
  // When
  await manager.setToLoading();
  await manager.setToFailure({ error: new Error("Connection failed"), action: recovery });
  // Then
  expect(toast.style).toBe(Toast.Style.Failure);
  expect(toast.message).toBe("Connection failed");
  expect(toast.primaryAction).toBe(recovery);
  expect(toast.secondaryAction).toBeDefined();
  // When
  await expect(manager.setToLoading()).resolves.toBe(manager);
  // Then
  expect(mockShowToast).toHaveBeenCalledOnce();
  expect(toast.style).toBe(Toast.Style.Animated);
  expect(toast.title).toBe(titles.loading);
  expect(toast.message).toBeUndefined();
  expect(toast.primaryAction).toBeUndefined();
  expect(toast.secondaryAction).toBeUndefined();
  expect(toast.show).toHaveBeenCalled();
});

test("shows success without closing Raycast when no progress toast exists", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToSuccess();
  // Then
  expect(mockShowToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: titles.success });
  expect(mockShowHUD).not.toHaveBeenCalled();
  expect(mockCloseMainWindow).not.toHaveBeenCalled();
});

test("supports success title overrides and suffixes", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToSuccess({ titleOverride: "Custom success title", titleSuffix: "Device 1" });
  // Then
  expect(mockShowToast).toHaveBeenCalledWith({
    style: Toast.Style.Success,
    title: "Custom success title - Device 1",
  });
});

test("replaces progress through showToast to allow the HUD fallback", async () => {
  // Given
  const mockToast = makeMockToast();
  mockShowToast.mockResolvedValueOnce(mockToast as unknown as Toast);
  // When
  const manager = new ToastManager(titles);
  await manager.setToLoading();
  vi.clearAllMocks();
  await expect(manager.setToSuccess()).resolves.toBe(manager);
  // Then
  expect(mockToast.hide).toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: titles.success });
  expect(vi.mocked(mockToast.hide).mock.invocationCallOrder[0]).toBeLessThan(mockShowToast.mock.invocationCallOrder[0]);
  expect(mockShowHUD).not.toHaveBeenCalled();
  expect(mockCloseMainWindow).not.toHaveBeenCalled();
});

test("shows a copyable fallback message when no error is provided", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToFailure();
  // Then
  expect(mockShowToast).toHaveBeenCalledWith({
    style: Toast.Style.Failure,
    title: titles.failure,
    message: "An unexpected error occurred.",
    primaryAction: expect.objectContaining({
      title: "Copy Error",
      shortcut: Keyboard.Shortcut.Common.Copy,
    }),
  });
});

test("displays and copies the exact error message", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  const error = new Error("Connection failed");
  await manager.setToFailure({ error });
  // Then
  const options = mockShowToast.mock.calls[0][0] as unknown as Toast.Options;
  expect(options.message).toBe(error.message);
  // When
  await options.primaryAction?.onAction(makeMockToast() as unknown as Toast);
  // Then
  expect(mockClipboardCopy).toHaveBeenCalledWith(error.message);
  expect(mockCloseMainWindow).not.toHaveBeenCalled();
  expect(mockShowHUD).not.toHaveBeenCalled();
});

test("uses a provided failure action and keeps copy error as the secondary action", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  const action = { title: "Open Command Preferences", onAction: vi.fn() };
  await manager.setToFailure({ error: new Error("Invalid cycle preferences"), action });
  // Then
  const options = mockShowToast.mock.calls[0][0] as unknown as Toast.Options;
  expect(options.primaryAction).toBe(action);
  expect(options.secondaryAction).toEqual(
    expect.objectContaining({ title: "Copy Error", shortcut: Keyboard.Shortcut.Common.Copy }),
  );
  // When
  await options.secondaryAction?.onAction?.(makeMockToast() as unknown as Toast);
  // Then
  expect(mockClipboardCopy).toHaveBeenCalledWith("Invalid cycle preferences");
});

test("updates an existing progress toast with a custom action and copy secondary", async () => {
  // Given
  const mockToast = makeMockToast();
  const action = { title: "Open Command Preferences", onAction: vi.fn() };
  mockShowToast.mockResolvedValueOnce(mockToast as unknown as Toast);
  // When
  const manager = new ToastManager(titles);
  await manager.setToLoading();
  await manager.setToFailure({ error: new Error("Invalid cycle preferences"), action });
  // Then
  expect(mockToast.primaryAction).toBe(action);
  expect(mockToast.secondaryAction).toEqual(
    expect.objectContaining({ title: "Copy Error", shortcut: Keyboard.Shortcut.Common.Copy }),
  );
  // When
  await mockToast.secondaryAction?.onAction?.(makeMockToast() as unknown as Toast);
  // Then
  expect(mockClipboardCopy).toHaveBeenCalledWith("Invalid cycle preferences");
});

test("updates the progress toast in place and keeps it visible", async () => {
  // Given
  const mockToast = makeMockToast();
  mockShowToast.mockResolvedValueOnce(mockToast as unknown as Toast);
  // When
  const manager = new ToastManager(titles);
  await manager.setToLoading();
  vi.clearAllMocks();
  await expect(
    manager.setToFailure({ titleOverride: "Not connected", error: new Error("Connect them") }),
  ).resolves.toBe(manager);
  // Then
  expect(mockShowToast).not.toHaveBeenCalled();
  expect(mockToast.style).toBe(Toast.Style.Failure);
  expect(mockToast.title).toBe("Not connected");
  expect(mockToast.message).toBe("Connect them");
  expect(mockToast.primaryAction).toEqual(
    expect.objectContaining({ title: "Copy Error", shortcut: Keyboard.Shortcut.Common.Copy }),
  );
  expect(mockToast.show).toHaveBeenCalled();
  expect(mockToast.hide).not.toHaveBeenCalled();
  expect(mockShowHUD).not.toHaveBeenCalled();
});

test("uses a non-empty thrown string as the error message", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToFailure({ error: "  CLI failed  " });
  // Then
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      message: "CLI failed",
    }),
  );
});

test("supports a failure title suffix", async () => {
  // Given
  const manager = new ToastManager(titles);
  // When
  await manager.setToFailure({ titleSuffix: "Device 1", error: new Error("Failed") });
  // Then
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: `${titles.failure} - Device 1`,
    }),
  );
});

test("hides an existing toast and creates a fresh toast for the next operation", async () => {
  // Given
  const toast = makeMockToast();
  mockShowToast.mockResolvedValueOnce(toast as unknown as Toast);
  const manager = new ToastManager(titles);
  // When
  await manager.hide();
  // Then
  expect(mockShowToast).not.toHaveBeenCalled();
  // When
  await manager.setToLoading();
  await manager.hide();
  // Then
  expect(toast.hide).toHaveBeenCalledOnce();
  // When
  await manager.setToLoading();
  // Then
  expect(mockShowToast).toHaveBeenCalledTimes(2);
});
