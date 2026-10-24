import { closeMainWindow, open, popToRoot } from "@raycast/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openAttachment, openDailyDeskNote, openNote, openWorkspace } from "@lib/octarine";

afterEach(() => {
  vi.restoreAllMocks();
});

function parseUri(uri: string) {
  const [schemeAndAction, query = ""] = uri.split("?");

  return {
    action: schemeAndAction.replace("octarine://", ""),
    params: new URLSearchParams(query),
  };
}

function getOpenedUri(): ReturnType<typeof parseUri> {
  const [[uri]] = vi.mocked(open).mock.calls;
  return parseUri(uri);
}

describe("octarine", () => {
  it("opens workspaces using their Octarine name", async () => {
    await openWorkspace("Codely Agentic Programming");
    const parsed = getOpenedUri();

    expect(parsed.action).toBe("daily");
    expect(parsed.params.get("date")).toBe("today");
    expect(parsed.params.get("workspace")).toBe("Codely Agentic Programming");
  });

  it("opens note URIs and closes Raycast", async () => {
    await openNote("docs/plan.md", "Work");
    const parsed = getOpenedUri();

    expect(parsed.action).toBe("open");
    expect(parsed.params.get("path")).toBe("docs/plan.md");
    expect(parsed.params.get("workspace")).toBe("Work");
    expect(popToRoot).toHaveBeenCalledWith({ clearSearchBar: true });
    expect(closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: true });
  });

  it("runs the post-open callback before closing Raycast", async () => {
    const events: string[] = [];
    vi.mocked(open).mockImplementationOnce(async () => {
      events.push("open");
    });
    vi.mocked(popToRoot).mockImplementationOnce(async () => {
      events.push("popToRoot");
    });
    vi.mocked(closeMainWindow).mockImplementationOnce(async () => {
      events.push("closeMainWindow");
    });

    await openNote("docs/plan.md", "Work", async () => {
      events.push("afterOpen");
    });

    expect(events).toEqual(["open", "afterOpen", "popToRoot", "closeMainWindow"]);
  });

  it("still closes Raycast when returning to its root fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(popToRoot).mockRejectedValueOnce(new Error("Root unavailable"));

    await expect(openNote("docs/plan.md", "Work")).resolves.toBeUndefined();

    expect(closeMainWindow).toHaveBeenCalledWith({ clearRootSearch: true });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("keeps a successful open successful when closing Raycast fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(closeMainWindow).mockRejectedValueOnce(new Error("Window unavailable"));

    await expect(openNote("docs/plan.md", "Work")).resolves.toBeUndefined();

    expect(popToRoot).toHaveBeenCalledWith({ clearSearchBar: true });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("does not persist or close Raycast when Octarine fails to open", async () => {
    const afterOpen = vi.fn();
    vi.mocked(open).mockRejectedValueOnce(new Error("Open failed"));

    await expect(openNote("docs/plan.md", "Work", afterOpen)).rejects.toThrow("Open failed");

    expect(afterOpen).not.toHaveBeenCalled();
    expect(popToRoot).not.toHaveBeenCalled();
    expect(closeMainWindow).not.toHaveBeenCalled();
  });

  it("opens attachment search URIs", async () => {
    await openAttachment("team standup", "Work");
    const parsed = getOpenedUri();

    expect(parsed.action).toBe("search");
    expect(parsed.params.get("query")).toBe("team standup");
    expect(parsed.params.get("workspace")).toBe("Work");
  });

  it("opens daily desk note URIs", async () => {
    await openDailyDeskNote("2026-03-26", "Work");
    const parsed = getOpenedUri();

    expect(parsed.action).toBe("daily");
    expect(parsed.params.get("date")).toBe("2026-03-26");
    expect(parsed.params.get("workspace")).toBe("Work");
  });
});
