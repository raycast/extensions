import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import Command from "./search-integrations";
import { Cache } from "./test-utils/raycast";

vi.mock("@raycast/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@raycast/utils")>()),
  showFailureToast: vi.fn(),
}));

type Request = {
  url: URL;
  signal: AbortSignal;
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
};
let requests: Request[];
let renderer: ReactTestRenderer;
const response = (name: string) =>
  Response.json({
    results: [
      { domain: `${name}.com`, name, description: "", kinds: ["mcp"], url: `https://integrations.sh/${name}.com/` },
    ],
  });
const titles = () => renderer.root.findAllByType(List.Item).map(({ props }) => props.title);
const list = () => renderer.root.findByType(List);

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  Cache.instances.forEach((cache) => cache.data.clear());
  requests = [];
  // Deliberately allow settlement after abort to exercise stale-result guards.
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          requests.push({ url: new URL(url), signal: init.signal as AbortSignal, resolve, reject });
        }),
    ),
  );
});

afterEach(async () => {
  if (renderer) await act(() => renderer.unmount());
  vi.unstubAllGlobals();
});

async function mount() {
  await act(() => {
    renderer = create(<Command />);
  });
}
async function search(query: string) {
  await act(() => list().props.onSearchTextChange(query));
}

describe("abortable integration search", () => {
  it("passes a signal, trims queries, applies filters, and aborts both query and filter changes", async () => {
    await mount();
    expect(requests[0].url.searchParams.get("q")).toBe("");
    expect(requests[0].signal).toBeInstanceOf(AbortSignal);
    await search(" GitHub ");
    expect(requests[0].signal.aborted).toBe(true);
    expect(requests[1].url.searchParams.get("q")).toBe("GitHub");
    expect(requests[1].url.searchParams.get("limit")).toBe("30");
    await act(() => list().props.searchBarAccessory.props.onChange("mcp"));
    expect(requests[1].signal.aborted).toBe(true);
    expect(requests[2].url.searchParams.get("kind")).toBe("mcp");
    await act(() => requests[2].resolve(response("filtered")));
    await act(() => requests[1].resolve(response("unfiltered")));
    expect(titles()).toEqual(["filtered"]);
  });

  it("keeps the latest results when an older request completes afterwards", async () => {
    await mount();
    await search("latest");
    await act(() => requests[1].resolve(response("latest")));
    await act(() => requests[0].resolve(response("stale")));
    expect(titles()).toEqual(["latest"]);
    expect(list().props.isLoading).toBe(false);
  });

  it("keeps loading while an obsolete request fails and reports only a current failure", async () => {
    await mount();
    await search("latest");
    await act(() => requests[0].reject(new Error("stale failure")));
    expect(showFailureToast).not.toHaveBeenCalled();
    expect(list().props.isLoading).toBe(true);
    await act(() => requests[1].resolve(new Response("Unavailable", { status: 503 })));
    expect(showFailureToast).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }), {
      title: "Could not search integrations.sh",
    });
    expect(list().props.isLoading).toBe(false);
    await search("recovered");
    await act(() => requests[2].resolve(response("recovered")));
    expect(titles()).toEqual(["recovered"]);
  });

  it("suppresses abort errors while the replacement search completes", async () => {
    await mount();
    requests[0].signal.addEventListener("abort", () => requests[0].reject(new DOMException("Aborted", "AbortError")));
    await search("new");
    await act(() => requests[1].resolve(response("new")));
    expect(showFailureToast).not.toHaveBeenCalled();
    expect(titles()).toEqual(["new"]);
    expect(list().props.isLoading).toBe(false);
  });

  it("handles A-to-B-to-A searches without accepting the first A response", async () => {
    await mount();
    await search("A");
    await search("B");
    await search("A");
    expect(requests).toHaveLength(4);
    await act(() => requests[3].resolve(response("new-A")));
    await act(() => requests[1].resolve(response("old-A")));
    await act(() => requests[2].resolve(response("B")));
    expect(titles()).toEqual(["new-A"]);
    await search("A");
    expect(requests).toHaveLength(4);
  });

  it("aborts on unmount and ignores late failures", async () => {
    await mount();
    await act(() => renderer.unmount());
    expect(requests[0].signal.aborted).toBe(true);
    await act(() => requests[0].reject(new Error("late failure")));
    expect(showFailureToast).not.toHaveBeenCalled();
  });
});
