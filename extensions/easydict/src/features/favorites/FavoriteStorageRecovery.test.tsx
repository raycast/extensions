// @vitest-environment jsdom

import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FavoriteStorageRecovery } from "./FavoriteStorageRecovery";
import { readFavoriteWords, restoreFavoriteWords, restoreLegacyFavoriteWords } from "./repository";

const runtime = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  directory: "",
  confirm: vi.fn(),
  pop: vi.fn(),
  toast: vi.fn(),
  failure: vi.fn(),
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: runtime.failure }));
vi.mock("@raycast/api", async () => {
  const { createElement, useState } = await import("react");
  const group = ({ children, actions }: { children?: ReactNode; actions?: ReactNode }) =>
    createElement("div", null, children, actions);
  const action = ({ title, onAction }: { title: string; onAction?: () => void }) =>
    createElement("button", { onClick: onAction }, title);
  const push = ({ title, target }: { title: string; target: ReactNode }) => {
    const [opened, setOpened] = useState(false);
    return opened ? target : createElement("button", { onClick: () => setOpened(true) }, title);
  };
  return {
    Action: Object.assign(action, {
      Push: push,
      Open: action,
      SubmitForm: ({ title, onSubmit }: { title: string; onSubmit: () => void }) =>
        createElement("button", { onClick: onSubmit }, title),
    }),
    ActionPanel: group,
    Detail: ({ markdown, actions }: { markdown: string; actions: ReactNode }) =>
      createElement("div", null, markdown, actions),
    Form: Object.assign(group, {
      FilePicker: ({
        title,
        value,
        onChange,
        error,
      }: {
        title: string;
        value: string[];
        onChange: (paths: string[]) => void;
        error?: string;
      }) =>
        createElement(
          "div",
          null,
          createElement("input", {
            "aria-label": title,
            value: value[0] ?? "",
            onChange: (event: { target: { value: string } }) => onChange([event.target.value]),
          }),
          error,
        ),
    }),
    Icon: { Download: "download", ArrowClockwise: "refresh" },
    Keyboard: { Shortcut: { Common: { Refresh: {} } } },
    Toast: { Style: { Success: "success" } },
    confirmAlert: runtime.confirm,
    showToast: runtime.toast,
    useNavigation: () => ({ pop: runtime.pop }),
    environment: {
      get supportPath() {
        return runtime.directory;
      },
    },
    LocalStorage: {
      getItem: async (key: string) => runtime.storage.get(key),
      setItem: async (key: string, value: string) => {
        runtime.storage.set(key, value);
      },
    },
  };
});

beforeEach(async () => {
  runtime.storage.clear();
  runtime.storage.set("favorite-content-v1", "broken favorites");
  runtime.directory = await mkdtemp(join(tmpdir(), "easydict-favorite-ui-"));
  runtime.confirm.mockReset().mockResolvedValue(true);
  runtime.pop.mockReset();
  runtime.toast.mockReset();
  runtime.failure.mockReset();
});
afterEach(async () => {
  cleanup();
  await rm(runtime.directory, { recursive: true, force: true });
});

async function renderRecovery() {
  const state = await readFavoriteWords();
  if (state.kind === "ready") throw new Error("Expected stored data error");
  render(
    <FavoriteStorageRecovery
      state={state}
      onReload={readFavoriteWords}
      onRestore={restoreFavoriteWords}
      onRestoreLegacy={restoreLegacyFavoriteWords}
    />,
  );
}

function chooseFile(path: string) {
  fireEvent.click(screen.getByRole("button", { name: "Restore from Backup" }));
  fireEvent.change(screen.getByLabelText("Backup File"), { target: { value: path } });
}

describe("favorite recovery actions", () => {
  it("offers export but no restore for a future version and preserves its exact raw data", async () => {
    runtime.storage.set("favorite-content-v1", '{ "version": 42, "favorites": [] }');
    runtime.storage.set("favorite-words", "[]");
    await renderRecovery();
    expect(screen.queryByRole("button", { name: "Restore from Backup" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Restore Previous-Version Favorites" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Export Original Data" }));
    await screen.findByRole("button", { name: "Open Backup Folder" });
    const directory = join(runtime.directory, "favorite-backups");
    const files = await readdir(directory);
    expect(await readFile(join(directory, files[0]), "utf8")).toBe(runtime.storage.get("favorite-content-v1"));
  });

  it("rejects an invalid chosen backup before asking to replace any data", async () => {
    const path = join(runtime.directory, "invalid.json");
    await writeFile(path, "{}");
    await renderRecovery();
    chooseFile(path);
    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));
    await waitFor(() => expect(runtime.failure).toHaveBeenCalled());
    expect(runtime.confirm).not.toHaveBeenCalled();
    expect(runtime.storage.get("favorite-content-v1")).toBe("broken favorites");
    expect(runtime.pop).not.toHaveBeenCalled();
  });

  it("restores only after confirmation and saves the previous raw data first", async () => {
    const path = join(runtime.directory, "empty.json");
    await writeFile(path, "[]");
    runtime.confirm.mockResolvedValueOnce(false);
    await renderRecovery();
    chooseFile(path);
    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));
    await waitFor(() => expect(runtime.confirm).toHaveBeenCalledTimes(1));
    expect(runtime.storage.get("favorite-content-v1")).toBe("broken favorites");
    fireEvent.click(screen.getByRole("button", { name: "Restore Backup" }));
    await waitFor(() => expect(runtime.pop).toHaveBeenCalledTimes(1));
    expect(runtime.storage.get("favorite-content-v1")).toBe(JSON.stringify({ version: 1, favorites: [] }));
    const directory = join(runtime.directory, "favorite-backups");
    const files = await readdir(directory);
    expect(await readFile(join(directory, files[0]), "utf8")).toBe("broken favorites");
  });
});

describe("previous-version recovery action", () => {
  it("restores the previous collection only after confirmation and preserves the damaged current bytes", async () => {
    runtime.storage.set("favorite-words", "[]");
    runtime.confirm.mockResolvedValueOnce(false);
    await renderRecovery();
    fireEvent.click(screen.getByRole("button", { name: "Restore Previous-Version Favorites" }));
    await waitFor(() => expect(runtime.confirm).toHaveBeenCalledTimes(1));
    expect(runtime.storage.get("favorite-content-v1")).toBe("broken favorites");
    fireEvent.click(screen.getByRole("button", { name: "Restore Previous-Version Favorites" }));
    await waitFor(() =>
      expect(runtime.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Favorites Restored" })),
    );
    expect(runtime.storage.get("favorite-content-v1")).toBe(JSON.stringify({ version: 1, favorites: [] }));
    expect(runtime.storage.get("favorite-words")).toBe("[]");
    const directory = join(runtime.directory, "favorite-backups");
    const files = await readdir(directory);
    expect(await readFile(join(directory, files[0]), "utf8")).toBe("broken favorites");
  });

  it("reports unavailable previous data without claiming a successful restore", async () => {
    await renderRecovery();
    fireEvent.click(screen.getByRole("button", { name: "Restore Previous-Version Favorites" }));
    await waitFor(() => expect(runtime.failure).toHaveBeenCalled());
    expect(runtime.toast).not.toHaveBeenCalled();
    expect(runtime.storage.get("favorite-content-v1")).toBe("broken favorites");
  });
});
