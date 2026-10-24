// @vitest-environment happy-dom
/// <reference lib="dom" />
import { Clipboard, launchCommand, open } from "@raycast/api";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, vi, test } from "vitest";
import Command from "../manage-cli";
import { cliSetup, installedCliSetup, outdatedCliSetup } from "../test/fixtures/cli-setup";
import { deferred } from "../test/fixtures/deferred";
import { fakeTimers } from "../test/fixtures/fake-timers";
import { detectCliSetup } from "./detection";
import { runCliInstallation } from "./installation";
import type * as Detection from "./detection";

vi.mock("./detection", async (importOriginal) => {
  const actual = await importOriginal<typeof Detection>();
  return { ...actual, detectCliSetup: vi.fn() };
});

vi.mock("./installation", () => ({ runCliInstallation: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Renders Manage CLI into a detached container. `using` unmounts it and removes the container.
function createSetupView() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let unmounted = false;
  function unmount() {
    if (!unmounted) act(() => root.unmount());
    unmounted = true;
  }
  async function render() {
    await act(async () => {
      root.render(<Command />);
    });
  }
  function action(title: string) {
    return container.querySelector<HTMLButtonElement>(`[data-action-title="${title}"]`);
  }
  function primaryAction() {
    return container.querySelector("[data-action-title]")?.getAttribute("data-action-title");
  }
  async function click(title: string) {
    const button = action(title);
    expect(button).not.toBeNull();
    await act(async () => {
      button?.click();
    });
  }
  function markdown() {
    return container.querySelector('[data-testid="markdown"]')?.textContent ?? "";
  }
  function actionGroups() {
    const panel = container.querySelector("[data-testid='action-panel']");
    if (!panel) return [];
    return Array.from(panel.children, (section) => ({
      title: section.getAttribute("data-section-title"),
      actions: Array.from(section.querySelectorAll("[data-action-title]"), (element) =>
        element.getAttribute("data-action-title"),
      ),
    })).filter((group) => group.actions.length > 0);
  }

  return {
    render,
    action,
    primaryAction,
    click,
    markdown,
    actionGroups,
    container,
    unmount,
    [Symbol.dispose]: () => {
      unmount();
      container.remove();
    },
  };
}

const refresh = { title: null, actions: ["Refresh"] } as const;
const github = { title: null, actions: ["Open Pods Control on GitHub"] } as const;
const statusActions = [github] as const;

test("guides Homebrew installation by opening the official instructions", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup({ state: "needs-homebrew", brewPath: null }));
  // When
  await view.render();
  await view.click("Open Homebrew Installation Instructions");
  // Then
  expect(view.primaryAction()).toBe("Open Homebrew Installation Instructions");
  expect(view.markdown()).toContain("https://brew.sh");
  expect(open).toHaveBeenCalledWith("https://brew.sh");
  expect(Clipboard.copy).not.toHaveBeenCalled();
  // When
  await view.click("Open Pods Control on GitHub");
  // Then
  expect(open).toHaveBeenCalledWith("https://github.com/raulgg/pods-control#pods-control");
  expect(view.action("Install with Homebrew")).toBeNull();
  expect(view.action("Copy Source Install Command")).toBeNull();
});

test("moves from missing Homebrew to install after Refresh without automatically installing", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup());
  vi.mocked(detectCliSetup).mockResolvedValueOnce(cliSetup({ state: "needs-homebrew", brewPath: null }));
  // When
  await view.render();
  await view.click("Refresh");
  // Then
  expect(view.action("Install with Homebrew")).not.toBeNull();
  expect(runCliInstallation).not.toHaveBeenCalled();
  expect(launchCommand).not.toHaveBeenCalled();
});

test("guides developer tools installation by opening Apple's official instructions", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup());
  vi.mocked(detectCliSetup).mockResolvedValueOnce(
    cliSetup({ state: "needs-developer-tools", developerTools: "unavailable" }),
  );
  // When
  await view.render();
  await view.click("Open Apple's Installation Instructions");
  // Then
  expect(view.primaryAction()).toBe("Open Apple's Installation Instructions");
  expect(view.markdown()).toContain(
    "https://developer.apple.com/documentation/xcode/installing-the-command-line-tools",
  );
  expect(Clipboard.copy).not.toHaveBeenCalled();
  expect(open).toHaveBeenCalledWith(
    "https://developer.apple.com/documentation/xcode/installing-the-command-line-tools",
  );
  expect(view.action("Install with Homebrew")).toBeNull();
  expect(view.action("Open Installation Instructions")).toBeNull();
  // When
  await view.click("Refresh");
  // Then
  expect(view.action("Install with Homebrew")).not.toBeNull();
});

test("shows a persistent installing state, prevents duplicate actions, and then shows installation details", async () => {
  // Given
  using view = createSetupView();
  const detection = deferred<ReturnType<typeof cliSetup>>();
  vi.mocked(detectCliSetup).mockReturnValue(detection.promise);
  const installation = deferred<ReturnType<typeof cliSetup>>();
  vi.mocked(runCliInstallation).mockReturnValue(installation.promise);
  // When
  await view.render();
  // Then
  expect(view.action("Open Homebrew Installation Instructions")).toBeNull();
  expect(view.action("Install with Homebrew")).toBeNull();
  expect(view.action("Refresh")).toBeNull();
  expect(view.actionGroups()).toEqual([]);
  // When
  await act(async () => detection.resolve(cliSetup()));
  // Then
  const installAction = view.action("Install with Homebrew");
  const refreshAction = view.action("Refresh");
  expect(installAction).not.toBeNull();
  expect(refreshAction).not.toBeNull();
  // When
  await act(async () => {
    installAction?.click();
    refreshAction?.click();
    installAction?.click();
  });
  // Then
  expect(view.markdown()).toContain("# Installing CLI");
  expect(view.action("Install with Homebrew")).toBeNull();
  expect(view.action("Refresh")).toBeNull();
  expect(view.actionGroups()).toEqual([]);
  // When
  await act(async () => installation.resolve(installedCliSetup()));
  // Then
  expect(view.markdown()).toContain("# pods-control CLI is up to date");
  expect(view.markdown()).toContain("0.5.0");
  expect(view.markdown()).toContain("Homebrew");
  expect(view.markdown()).toContain("/opt/homebrew/bin/pods-control");
  expect(view.markdown()).not.toContain("**Latest:**");
  expect(view.actionGroups()).toEqual(statusActions);
  expect(runCliInstallation).toHaveBeenCalledExactlyOnceWith("install");
  expect(launchCommand).not.toHaveBeenCalled();
});

test("keeps a new setup view independent of an installation started in a closed view", async () => {
  // Given
  using oldView = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup());
  const installation = deferred<ReturnType<typeof cliSetup>>();
  vi.mocked(runCliInstallation).mockReturnValue(installation.promise);
  await oldView.render();
  // When
  await oldView.click("Install with Homebrew");
  oldView.unmount();
  using newView = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup({ state: "needs-homebrew", brewPath: null }));
  await newView.render();
  // Then
  expect(newView.action("Open Homebrew Installation Instructions")).not.toBeNull();
  // When
  await act(async () => installation.resolve(installedCliSetup()));
  // Then
  expect(newView.action("Open Homebrew Installation Instructions")).not.toBeNull();
  expect(newView.action("Install with Homebrew")).toBeNull();
  expect(oldView.container.childElementCount).toBe(0);
  expect(launchCommand).not.toHaveBeenCalled();
});

test.each([
  ["install", "Install with Homebrew", "Copy Install Command", "brew install raulgg/tap/pods-control"],
  ["update", "Update with Homebrew", "Copy Update Command", "brew update\nbrew upgrade raulgg/tap/pods-control"],
] as const)("offers a direct %s before alternatives you run yourself", async (state, title, copyTitle, command) => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(state === "install" ? cliSetup() : outdatedCliSetup());
  // When
  await view.render();
  // Then
  expect(view.primaryAction()).toBe(title);
  if (state === "install") {
    expect(view.markdown()).toContain("https://github.com/raulgg/pods-control/blob/HEAD/README.md#install");
  } else {
    expect(view.markdown()).toContain("**Latest:**");
    expect(view.markdown()).toContain("Update with Homebrew");
  }
  // When
  await view.click(copyTitle);
  // Then
  expect(Clipboard.copy).toHaveBeenCalledWith(command);
  expect(runCliInstallation).not.toHaveBeenCalled();
  // When
  if (state === "install") {
    expect(view.action("Open Installation Instructions")).not.toBeNull();
  }
  expect(view.action("Copy Source Install Command")).toBeNull();
  const operation = deferred<ReturnType<typeof cliSetup>>();
  vi.mocked(runCliInstallation).mockReturnValue(operation.promise);
  await view.click(title);
  // Then
  expect(runCliInstallation).toHaveBeenCalledExactlyOnceWith(state);
  expect(view.action(title)).toBeNull();
  expect(view.action(copyTitle)).toBeNull();
  expect(view.markdown()).toContain(state === "install" ? "# Installing" : "# Updating");
  // When
  await act(async () => operation.resolve(installedCliSetup()));
  // Then
  expect(view.markdown()).toContain("# pods-control CLI is up to date");
  expect(view.markdown()).toContain("0.5.0");
  expect(view.markdown()).toContain("Homebrew");
  expect(view.markdown()).toContain("/opt/homebrew/bin/pods-control");
  expect(view.markdown()).not.toContain("**Latest:**");
  expect(view.action("Open Installation Instructions")).toBeNull();
});

test.each([
  { name: "Homebrew has not linked the keg", brewLinked: false, command: "brew link raulgg/tap/pods-control" },
  {
    name: "Homebrew already reports the keg as linked",
    brewLinked: true,
    command: "brew link --overwrite raulgg/tap/pods-control",
  },
  { name: "the link status is unknown", brewLinked: null, command: "brew link raulgg/tap/pods-control" },
] as const)("copies the link command that applies when $name", async ({ brewLinked, command }) => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(
    cliSetup({ state: "needs-link", brewCliPrefix: "/opt/homebrew/opt/pods-control", brewLinked }),
  );
  // When
  await view.render();
  await view.click("Copy Link Command");
  // Then
  expect(Clipboard.copy).toHaveBeenCalledWith(command);
  expect(view.markdown()).toContain("/opt/homebrew/opt/pods-control/bin/pods-control");
  expect(view.action("Copy Reinstall Command")).toBeNull();
});

test("offers a reinstall when the Homebrew keg holds no usable CLI", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(
    cliSetup({ state: "needs-reinstall", brewCliPrefix: "/opt/homebrew/opt/pods-control" }),
  );
  // When
  await view.render();
  await view.click("Copy Reinstall Command");
  // Then
  expect(Clipboard.copy).toHaveBeenCalledWith("brew reinstall raulgg/tap/pods-control");
  expect(view.markdown()).toContain("/opt/homebrew/opt/pods-control/bin/pods-control");
  expect(view.action("Copy Link Command")).toBeNull();
});

test("keeps failure details visible until the user rechecks prerequisites", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup());
  vi.mocked(runCliInstallation).mockRejectedValueOnce(new Error("Homebrew needs repair\nRun brew doctor"));
  // When
  await view.render();
  await view.click("Install with Homebrew");
  // Then
  expect(view.markdown()).toContain("Run brew doctor");
  expect(view.action("Install with Homebrew")).toBeNull();
  expect(view.actionGroups()).toEqual([
    { title: null, actions: ["Copy Error"] },
    { title: null, actions: ["Open Installation Instructions", "Open Pods Control on GitHub"] },
    refresh,
  ]);
  // When
  await view.click("Copy Error");
  // Then
  expect(Clipboard.copy).toHaveBeenCalledWith("Homebrew needs repair\nRun brew doctor");
  // When
  await view.click("Refresh");
  // Then
  expect(view.action("Install with Homebrew")).not.toBeNull();
});

test("offers retry and instructions after a detection error", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(cliSetup());
  vi.mocked(detectCliSetup).mockRejectedValueOnce(new Error("brew permissions"));
  // When
  await view.render();
  // Then
  expect(view.markdown()).toContain("brew permissions");
  expect(view.actionGroups()).toEqual([
    { title: null, actions: ["Copy Error"] },
    { title: null, actions: ["Open Installation Instructions", "Open Pods Control on GitHub"] },
    refresh,
  ]);
  // When
  await view.click("Refresh");
  // Then
  expect(view.action("Install with Homebrew")).not.toBeNull();
});

test.each([
  {
    name: "install",
    setup: cliSetup(),
    groups: [
      {
        title: null,
        actions: ["Install with Homebrew", "Copy Install Command"],
      },
      { title: null, actions: ["Open Installation Instructions", "Open Pods Control on GitHub"] },
      refresh,
    ],
  },
  {
    name: "needs Homebrew",
    setup: cliSetup({ state: "needs-homebrew", brewPath: null }),
    groups: [
      { title: null, actions: ["Open Homebrew Installation Instructions", "Open Pods Control on GitHub"] },
      refresh,
    ],
  },
  {
    name: "needs developer tools",
    setup: cliSetup({ state: "needs-developer-tools", developerTools: "unavailable" }),
    groups: [
      { title: null, actions: ["Open Apple's Installation Instructions", "Open Pods Control on GitHub"] },
      refresh,
    ],
  },
  {
    name: "invalid CLI Path",
    setup: cliSetup({ state: "invalid-cli-path", configuredCliPath: "/old/cli" }),
    groups: [{ title: null, actions: ["Open Extension Preferences"] }, github, refresh],
  },
  {
    name: "needs Homebrew link",
    setup: cliSetup({ state: "needs-link" }),
    groups: [{ title: null, actions: ["Copy Link Command", "Open Extension Preferences"] }, github, refresh],
  },
  {
    name: "needs Homebrew reinstall",
    setup: cliSetup({ state: "needs-reinstall", brewCliPrefix: "/opt/homebrew/opt/pods-control" }),
    groups: [{ title: null, actions: ["Copy Reinstall Command"] }, github, refresh],
  },
  {
    name: "setup already running",
    setup: cliSetup({ state: "installing" }),
    groups: statusActions,
  },
  {
    name: "Homebrew up to date",
    setup: installedCliSetup(),
    groups: statusActions,
  },
  {
    name: "Homebrew update available",
    setup: outdatedCliSetup(),
    groups: [
      { title: null, actions: ["Update with Homebrew", "Copy Update Command"] },
      { title: null, actions: ["Open Installation Instructions", "Open Pods Control on GitHub"] },
      refresh,
    ],
  },
  {
    name: "source install up to date",
    setup: cliSetup({
      state: "source-cli",
      cliPath: "/usr/local/bin/pods-control",
      brewPath: null,
      installationMethod: "source",
      installedVersion: "0.5.0",
      latestVersion: "0.5.0",
      latestSource: "github",
      versionStatus: "up-to-date",
      meetsMinimum: true,
    }),
    groups: statusActions,
  },
  {
    name: "source install update available",
    setup: cliSetup({
      state: "source-cli",
      cliPath: "/usr/local/bin/pods-control",
      brewPath: null,
      installationMethod: "source",
      installedVersion: "0.5.0",
      latestVersion: "0.6.0",
      latestSource: "github",
      versionStatus: "update-available",
      meetsMinimum: true,
    }),
    groups: [
      { title: null, actions: ["Copy Source Install Command"] },
      { title: null, actions: ["Open Installation Instructions", "Open Pods Control on GitHub"] },
      refresh,
    ],
  },
] as const)("uses untitled next-step, docs, and utility groups for $name", async ({ setup, groups }) => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(setup);
  // When
  await view.render();
  // Then
  expect(view.actionGroups()).toEqual(groups);
});

test("shows progress for an already-running Homebrew install, waits for each slow check, and refreshes when it finishes", async () => {
  // Given
  using view = createSetupView();
  const slowCheck = deferred<ReturnType<typeof cliSetup>>();
  vi.mocked(detectCliSetup)
    .mockResolvedValueOnce(cliSetup({ state: "installing" }))
    .mockReturnValueOnce(slowCheck.promise)
    .mockResolvedValue(installedCliSetup());
  using timers = fakeTimers();
  // When
  await view.render();
  // Then
  expect(view.container.querySelector("[data-testid='detail']")?.getAttribute("data-loading")).toBe("true");
  expect(view.actionGroups()).toEqual(statusActions);
  expect(detectCliSetup).toHaveBeenCalledOnce();
  // When
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  // Then
  expect(detectCliSetup).toHaveBeenCalledTimes(2);
  // When
  await act(async () => {
    await vi.advanceTimersByTimeAsync(9000);
  });
  // Then
  expect(detectCliSetup).toHaveBeenCalledTimes(2);
  // When
  await act(async () => {
    slowCheck.resolve(cliSetup({ state: "installing" }));
    await vi.advanceTimersByTimeAsync(2999);
  });
  // Then
  expect(detectCliSetup).toHaveBeenCalledTimes(2);
  expect(view.container.querySelector("[data-testid='detail']")?.getAttribute("data-loading")).toBe("true");
  // When
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  // Then
  expect(detectCliSetup).toHaveBeenCalledTimes(3);
  expect(view.container.querySelector("[data-testid='detail']")?.getAttribute("data-loading")).toBe("false");
  expect(view.actionGroups()).toEqual(statusActions);
});

test("shows Homebrew install facts without update actions when the CLI is up to date", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(installedCliSetup());
  // When
  await view.render();
  // Then
  expect(view.markdown()).toContain("# pods-control CLI is up to date");
  expect(view.markdown()).toContain("0.5.0");
  expect(view.markdown()).toContain("Homebrew");
  expect(view.markdown()).not.toContain("**Latest:**");
  expect(view.actionGroups()).toEqual(statusActions);
});

test("shows source install facts without update actions when the CLI is up to date", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(
    cliSetup({
      state: "source-cli",
      cliPath: "/usr/local/bin/pods-control",
      brewPath: null,
      installationMethod: "source",
      installedVersion: "0.5.0",
      latestVersion: "0.5.0",
      latestSource: "github",
      versionStatus: "up-to-date",
      meetsMinimum: true,
    }),
  );
  // When
  await view.render();
  // Then
  expect(view.markdown()).toContain("# pods-control CLI is up to date");
  expect(view.markdown()).toContain("0.5.0");
  expect(view.markdown()).toContain("Source");
  expect(view.markdown()).not.toContain("**Latest:**");
  expect(view.actionGroups()).toEqual(statusActions);
});

test("copies the source install command for a source-install update without Homebrew help", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(
    cliSetup({
      state: "source-cli",
      cliPath: "/usr/local/bin/pods-control",
      brewPath: null,
      installationMethod: "source",
      installedVersion: "0.5.0",
      latestVersion: "0.6.0",
      latestSource: "github",
      versionStatus: "update-available",
      meetsMinimum: true,
    }),
  );
  // When
  await view.render();
  await view.click("Copy Source Install Command");
  await view.click("Open Installation Instructions");
  // Then
  expect(Clipboard.copy).toHaveBeenCalledWith(
    [
      "tag=$(curl -fsSL -o /dev/null -w '%{url_effective}' https://github.com/raulgg/pods-control/releases/latest)",
      "tag=${tag##*/}",
      "base=https://raw.githubusercontent.com/raulgg/pods-control/$tag",
      'curl -fsSL "$base/scripts/install-from-source.sh" | sh -s -- --version "$tag"',
    ].join("\n"),
  );
  expect(open).toHaveBeenCalledWith("https://github.com/raulgg/pods-control/blob/HEAD/README.md#install");
  expect(view.markdown()).toContain("https://github.com/raulgg/pods-control/blob/HEAD/README.md#install");
  expect(view.action("Open Homebrew Installation Instructions")).toBeNull();
  expect(view.action("Update with Homebrew")).toBeNull();
  expect(view.action("Copy Update Command")).toBeNull();
});

test("offers a Homebrew update when the CLI is below the minimum even if it matches the tap", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(
    installedCliSetup({
      installedVersion: "0.3.0",
      latestVersion: "0.3.0",
      versionStatus: "up-to-date",
      meetsMinimum: false,
    }),
  );
  // When
  await view.render();
  // Then
  expect(view.action("Update with Homebrew")).not.toBeNull();
  expect(view.action("Copy Update Command")).not.toBeNull();
  expect(view.markdown()).toContain("**Latest:**");
});

test("keeps a Homebrew update available when the CLI version is unknown", async () => {
  // Given
  using view = createSetupView();
  vi.mocked(detectCliSetup).mockResolvedValue(
    installedCliSetup({
      installedVersion: null,
      versionStatus: "unknown",
      meetsMinimum: null,
    }),
  );
  // When
  await view.render();
  // Then
  expect(view.action("Update with Homebrew")).not.toBeNull();
  expect(view.action("Copy Update Command")).not.toBeNull();
  expect(view.markdown()).toContain("**Latest:**");
});

test("does not navigate or start installation after leaving during detection", async () => {
  // Given
  using view = createSetupView();
  const detection = deferred<ReturnType<typeof cliSetup>>();
  vi.mocked(detectCliSetup).mockReturnValue(detection.promise);
  // When
  await view.render();
  view.unmount();
  await act(async () => detection.resolve(cliSetup()));
  // Then
  expect(runCliInstallation).not.toHaveBeenCalled();
  expect(launchCommand).not.toHaveBeenCalled();
});
