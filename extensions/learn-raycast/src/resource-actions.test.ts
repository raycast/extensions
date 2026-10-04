import { beforeEach, describe, expect, it, vi } from "vitest";
import BrowseResources, { WorkspaceResourceList } from "./browse-resources.js";
import { AddResourceForm } from "./add-resource.js";
import { EditTagsForm } from "./resource-forms.js";

const mocks = vi.hoisted(() => ({
  usePromise: vi.fn(),
  revalidate: vi.fn(),
  push: vi.fn(),
  pop: vi.fn(),
  confirmAlert: vi.fn(),
  removeLearnResource: vi.fn(),
  addLearnResource: vi.fn(),
  updateLearnTags: vi.fn(),
  startIngestion: vi.fn(),
  showToast: vi.fn(),
  open: vi.fn(),
  setItem: vi.fn(),
  closeMainWindow: vi.fn(),
}));
vi.mock("@raycast/api", () => {
  const component = (name: string) =>
    Object.assign(() => null, { displayName: name });
  return {
    Action: Object.assign(component("Action"), {
      SubmitForm: "SubmitForm",
      Open: "Open",
      ShowInFinder: "ShowInFinder",
      CopyToClipboard: "CopyToClipboard",
      Style: { Destructive: "destructive" },
    }),
    ActionPanel: Object.assign(component("ActionPanel"), {
      Section: "Section",
      Submenu: "Submenu",
    }),
    List: Object.assign(component("List"), {
      Item: "ListItem",
      Section: "ListSection",
      EmptyView: "EmptyView",
      Dropdown: Object.assign(component("Dropdown"), { Item: "DropdownItem" }),
    }),
    Form: Object.assign(component("Form"), {
      TextField: "TextField",
      Description: "Description",
      Dropdown: Object.assign(component("FormDropdown"), {
        Item: "FormDropdownItem",
      }),
    }),
    Icon: {},
    Color: {},
    Keyboard: { Shortcut: { Common: { New: {}, Refresh: {} } } },
    Alert: { ActionStyle: { Destructive: "destructive" } },
    confirmAlert: mocks.confirmAlert,
    showToast: mocks.showToast,
    Toast: { Style: { Failure: "failure", Success: "success" } },
    open: mocks.open,
    Clipboard: { copy: vi.fn() },
    LocalStorage: { setItem: mocks.setItem },
    closeMainWindow: mocks.closeMainWindow,
    useNavigation: () => ({ push: mocks.push, pop: mocks.pop }),
  };
});
vi.mock("@raycast/utils", () => ({ usePromise: mocks.usePromise }));
vi.mock("react", () => ({
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, vi.fn()],
  useEffect: vi.fn(),
}));
vi.mock("./learn-cli.js", () => ({
  listLearnResources: vi.fn(),
  listLearnWorkspaces: vi.fn(),
  removeLearnResource: mocks.removeLearnResource,
  addLearnResource: mocks.addLearnResource,
  updateLearnTags: mocks.updateLearnTags,
}));
vi.mock("./ingestion.js", () => ({
  startIngestion: mocks.startIngestion,
  ingestTerminalCommand: () => "learn ingest",
}));
vi.mock("./preferences.js", () => ({ getLearnExecutable: () => "learn" }));

type Element = {
  props: {
    title?: string;
    children?: Element | Element[];
    actions?: Element;
    onAction?: () => Promise<void>;
    onSubmit?: (values: Record<string, string>) => Promise<void>;
    onCreated?: (workspace: string) => Promise<void>;
    onCaptureChanged?: () => Promise<void>;
    onWorkspaceCreated?: () => Promise<void>;
  };
};
function action(root: unknown, title: string): Element {
  function find(node: unknown): Element | undefined {
    if (Array.isArray(node)) return node.map(find).find(Boolean);
    if (!node || typeof node !== "object" || !("props" in node)) return;
    const element = node as Element;
    if (element.props.title === title) return element;
    return find(element.props.actions) || find(element.props.children);
  }
  const found = find(root);
  if (!found) throw new Error(`Missing action: ${title}`);
  return found;
}
const resource = {
  source: "https://example.com",
  title: "Article",
  type: "web" as const,
  status: "ingested" as const,
  tags: ["old"],
  output: "web/article.md",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.usePromise.mockReturnValue({
    data: {
      path: "/custom/workspace",
      workspace: "papers",
      resources: [resource],
    },
    revalidate: mocks.revalidate,
  });
  mocks.confirmAlert.mockResolvedValue(true);
});
function list() {
  return WorkspaceResourceList({
    workspace: "papers",
    executable: "/bin/learn",
  });
}

describe("capture destination badge refresh", () => {
  function browse() {
    const refreshDestination = vi.fn().mockResolvedValue(undefined);
    mocks.usePromise
      .mockReturnValueOnce({
        data: ["papers", "notes"],
        revalidate: mocks.revalidate,
      })
      .mockReturnValueOnce({ data: "papers", revalidate: refreshDestination });
    return { view: BrowseResources(), refreshDestination };
  }

  it("propagates destination refresh to resource lists and runs it after storage succeeds", async () => {
    const { view, refreshDestination } = browse();
    await action(view, "Browse Resources").props.onAction!();
    const child = mocks.push.mock.calls[0][0] as Element;
    const resources = WorkspaceResourceList({
      workspace: "notes",
      executable: "learn",
      onCaptureChanged: child.props.onCaptureChanged,
    });
    await action(resources, "Use for Browser Capture").props.onAction!();
    expect(mocks.setItem).toHaveBeenCalledWith(
      "learn.capture.workspace",
      "notes",
    );
    expect(refreshDestination).toHaveBeenCalledOnce();
    expect(mocks.setItem.mock.invocationCallOrder[0]).toBeLessThan(
      refreshDestination.mock.invocationCallOrder[0],
    );
  });

  it("does not refresh the displayed destination when storage fails", async () => {
    const refreshDestination = vi.fn();
    mocks.setItem.mockRejectedValueOnce(new Error("Storage unavailable"));
    const resources = WorkspaceResourceList({
      workspace: "papers",
      executable: "learn",
      onCaptureChanged: refreshDestination,
    });
    await action(resources, "Use for Browser Capture").props.onAction!();
    expect(refreshDestination).not.toHaveBeenCalled();
  });

  it("refreshes the badge after creating a workspace and retains refresh in its resource list", async () => {
    const { view, refreshDestination } = browse();
    await action(view, "Create Workspace").props.onAction!();
    const form = mocks.push.mock.calls[0][0] as Element;
    await form.props.onCreated!("new-topic");
    expect(refreshDestination).toHaveBeenCalledOnce();
    expect(mocks.revalidate).toHaveBeenCalledOnce();
    const resources = mocks.push.mock.calls[1][0] as Element;
    expect(resources.props.onCaptureChanged).toBe(refreshDestination);
  });

  it("refreshes both workspace names and the destination on manual reload", async () => {
    const { view, refreshDestination } = browse();
    await action(view, "Reload Workspaces").props.onAction!();
    expect(mocks.revalidate).toHaveBeenCalledOnce();
    expect(refreshDestination).toHaveBeenCalledOnce();
  });

  it("propagates refresh through workspace creation inside the add form", async () => {
    mocks.usePromise.mockReturnValue({
      data: ["papers"],
      revalidate: mocks.revalidate,
    });
    const refreshDestination = vi.fn().mockResolvedValue(undefined);
    const form = AddResourceForm({
      workspace: "papers",
      executable: "learn",
      onWorkspaceCreated: refreshDestination,
    });
    await action(form, "Create Workspace").props.onAction!();
    const creation = mocks.push.mock.calls[0][0] as Element;
    await creation.props.onCreated!("notes");
    expect(refreshDestination).toHaveBeenCalledOnce();
    expect(mocks.pop).toHaveBeenCalledOnce();
  });
});

describe("resource actions", () => {
  it("does not mutate when removal is cancelled", async () => {
    mocks.confirmAlert.mockResolvedValue(false);
    await action(list(), "Remove Resource (Keep Content)").props.onAction!();
    expect(mocks.removeLearnResource).not.toHaveBeenCalled();
  });
  it("keeps and purges content through distinct confirmed actions and reloads", async () => {
    await action(list(), "Remove Resource (Keep Content)").props.onAction!();
    expect(mocks.removeLearnResource).toHaveBeenLastCalledWith(
      "papers",
      resource.source,
      false,
      "/bin/learn",
    );
    await action(list(), "Remove Resource and Delete Content").props
      .onAction!();
    expect(mocks.removeLearnResource).toHaveBeenLastCalledWith(
      "papers",
      resource.source,
      true,
      "/bin/learn",
    );
    expect(mocks.revalidate).toHaveBeenCalledTimes(2);
  });
  it("opens output relative to the workspace and hides purge for an outside output", async () => {
    await action(list(), "Open Ingested Content").props.onAction!();
    expect(mocks.open).toHaveBeenCalledWith("/custom/workspace/web/article.md");
    mocks.usePromise.mockReturnValue({
      data: {
        path: "/custom/workspace",
        resources: [{ ...resource, output: "../../outside" }],
      },
      revalidate: mocks.revalidate,
    });
    expect(() => action(list(), "Remove Resource and Delete Content")).toThrow(
      "Missing action",
    );
  });
  it("starts the explicitly selected agent in Terminal", async () => {
    await action(list(), "Ingest with pi").props.onAction!();
    expect(mocks.startIngestion).toHaveBeenCalledWith(
      "/bin/learn",
      "papers",
      "pi",
    );
  });
  it("adds a pending resource without starting ingestion and returns to the list", async () => {
    mocks.usePromise.mockReturnValue({
      data: ["papers"],
      revalidate: mocks.revalidate,
    });
    const onAdded = vi.fn();
    const form = AddResourceForm({
      workspace: "papers",
      executable: "/bin/learn",
      onAdded,
    });
    await action(form, "Add Resource").props.onSubmit!({
      source: " https://example.com ",
      title: " Article ",
      tags: "AI, AI, reading",
    });
    expect(mocks.addLearnResource).toHaveBeenCalledWith(
      "papers",
      resource.source,
      "Article",
      ["AI", "reading"],
      "/bin/learn",
    );
    expect(onAdded).toHaveBeenCalledOnce();
    expect(mocks.startIngestion).not.toHaveBeenCalled();
  });
  it("keeps the add form open on CLI failure", async () => {
    mocks.usePromise.mockReturnValue({
      data: ["papers"],
      revalidate: mocks.revalidate,
    });
    mocks.addLearnResource.mockRejectedValueOnce(new Error("Disk full"));
    const onAdded = vi.fn();
    await action(
      AddResourceForm({
        workspace: "papers",
        executable: "/bin/learn",
        onAdded,
      }),
      "Add Resource",
    ).props.onSubmit!({ source: resource.source, title: "", tags: "" });
    expect(onAdded).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Could not add resource",
      message: "Disk full",
    });
  });
  it("allows clearing all tags and refreshes only after success", async () => {
    const onSaved = vi.fn();
    await action(
      EditTagsForm({
        resource,
        workspace: "papers",
        executable: "/bin/learn",
        onSaved,
      }),
      "Save Tags",
    ).props.onSubmit!({ tags: "" });
    expect(mocks.updateLearnTags).toHaveBeenCalledWith(
      "papers",
      resource,
      [],
      "/bin/learn",
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });
});
