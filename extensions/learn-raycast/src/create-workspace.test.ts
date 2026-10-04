import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceForm } from "./create-workspace.js";

const mocks = vi.hoisted(() => ({
  createLearnWorkspace: vi.fn(),
  setItem: vi.fn(),
  closeMainWindow: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Action: { SubmitForm: "SubmitForm" },
  ActionPanel: "ActionPanel",
  Form: Object.assign(() => null, { TextField: "TextField" }),
  LocalStorage: { setItem: mocks.setItem },
  closeMainWindow: mocks.closeMainWindow,
  showToast: mocks.showToast,
  Toast: { Style: { Success: "success", Failure: "failure" } },
}));
vi.mock("react", () => ({
  useRef: (initial: unknown) => ({ current: initial }),
  useState: (initial: unknown) => [initial, vi.fn()],
}));
vi.mock("./learn-cli.js", () => ({
  createLearnWorkspace: mocks.createLearnWorkspace,
}));
vi.mock("./preferences.js", () => ({ getLearnExecutable: () => "learn" }));

function submitter(onCreated?: (workspace: string) => Promise<void>) {
  const form = CreateWorkspaceForm({ executable: "/path/to/learn", onCreated });
  return form.props.actions.props.children.props.onSubmit as (values: {
    name: string;
  }) => Promise<void>;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createLearnWorkspace.mockResolvedValue(undefined);
  mocks.setItem.mockResolvedValue(undefined);
  mocks.showToast.mockResolvedValue(undefined);
});

describe("Create Learn Workspace", () => {
  it("creates before remembering the trimmed name and continuing capture", async () => {
    const onCreated = vi.fn().mockResolvedValue(undefined);
    await submitter(onCreated)({ name: " papers " });

    expect(mocks.createLearnWorkspace).toHaveBeenCalledWith(
      "papers",
      "/path/to/learn",
    );
    expect(mocks.setItem).toHaveBeenCalledWith(
      "learn.capture.workspace",
      "papers",
    );
    expect(mocks.createLearnWorkspace.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.setItem.mock.invocationCallOrder[0],
    );
    expect(onCreated).toHaveBeenCalledWith("papers");
    expect(mocks.closeMainWindow).not.toHaveBeenCalled();
  });

  it("does not change selection or continue when creation fails", async () => {
    mocks.createLearnWorkspace.mockRejectedValue(
      new Error("Workspace already exists"),
    );
    const onCreated = vi.fn();
    await submitter(onCreated)({ name: "papers" });

    expect(mocks.setItem).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Could not finish workspace setup",
      message: "Workspace already exists",
    });
  });

  it("retries storage without creating the same workspace again", async () => {
    mocks.setItem.mockRejectedValueOnce(new Error("Storage unavailable"));
    const submit = submitter();
    await submit({ name: "papers" });
    await submit({ name: "papers" });

    expect(mocks.createLearnWorkspace).toHaveBeenCalledOnce();
    expect(mocks.setItem).toHaveBeenCalledTimes(2);
    expect(mocks.closeMainWindow).toHaveBeenCalledOnce();
  });

  it.each(["", " ", ".", "..", "../papers", "a/b", "a\\b"])(
    "rejects an invalid name %j before invoking the CLI",
    async (name) => {
      await submitter()({ name });
      expect(mocks.createLearnWorkspace).not.toHaveBeenCalled();
    },
  );
});
