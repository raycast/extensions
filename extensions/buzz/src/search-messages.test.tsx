/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { Message } from "./lib/types";

const mocks = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock("./lib/preferences", () => ({ getClient: mocks.getClient }));

import Command from "./search-messages";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClient.mockReset();
});

function message(partial: Partial<Message>): Message {
  return {
    id: "m1",
    author: "abcdef0123456789",
    content: "hello world",
    createdAt: 1700000000,
    channelId: "chan-1",
    replyCount: 0,
    ...partial,
  };
}

function fakeClient(overrides: Record<string, unknown> = {}) {
  return { searchMessages: vi.fn(async () => [message({})]), ...overrides };
}

function type(text: string) {
  fireEvent.change(screen.getByTestId("search-bar"), { target: { value: text } });
}

describe("Search Messages", () => {
  it("shows a configuration error on mount, before anything is typed", async () => {
    // Regression guard: the client used to be built only for a non-empty query,
    // which left a bad relay URL or key invisible behind the neutral empty view.
    mocks.getClient.mockImplementation(() => {
      throw new Error("Private key must be a 64-character hex string or an nsec1... key");
    });
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Private key must be a 64-character hex string or an nsec1... key",
      ),
    );
  });

  it("prompts for a query before searching anything", async () => {
    const client = fakeClient();
    mocks.getClient.mockReturnValue(client);
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Search Buzz messages"));
    expect(screen.getByTestId("empty-view")).toHaveAttribute(
      "data-description",
      "Type a query to search accessible channels",
    );
    expect(client.searchMessages).not.toHaveBeenCalled();
  });

  it("says the search found nothing, rather than asking for a query already typed", async () => {
    mocks.getClient.mockReturnValue(fakeClient({ searchMessages: vi.fn(async () => []) }));
    render(<Command />);
    type("nothing matches this");

    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matches"));
    const description = screen.getByTestId("empty-view").getAttribute("data-description") ?? "";
    expect(description).toMatch(/match/i);
    // The pre-search prompt would be an instruction the user has already followed.
    expect(description).not.toMatch(/type a query/i);
  });

  it("goes back to the prompt when the query is cleared", async () => {
    mocks.getClient.mockReturnValue(fakeClient({ searchMessages: vi.fn(async () => []) }));
    render(<Command />);
    type("nothing matches this");
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matches"));

    type("");

    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Search Buzz messages"));
  });

  it("searches the relay for what was typed", async () => {
    const client = fakeClient();
    mocks.getClient.mockReturnValue(client);
    render(<Command />);
    type("hello");
    await waitFor(() => expect(client.searchMessages).toHaveBeenCalledWith("hello"));
  });

  it("does not search for a whitespace-only query", async () => {
    const client = fakeClient();
    mocks.getClient.mockReturnValue(client);
    render(<Command />);
    type("   ");
    await waitFor(() => expect(screen.getByTestId("list")).toBeInTheDocument());
    expect(client.searchMessages).not.toHaveBeenCalled();
  });

  it("renders the matching messages with a truncated author", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({
        searchMessages: vi.fn(async () => [
          message({ id: "m1", content: "hello world" }),
          message({ id: "m2", content: "hello again" }),
        ]),
      }),
    );
    render(<Command />);
    type("hello");

    const rendered = await waitFor(() => {
      const found = screen.getAllByTestId("list-item");
      expect(found).toHaveLength(2);
      return found;
    });
    expect(rendered.map((el) => el.dataset.title)).toEqual(["hello world", "hello again"]);
    expect(rendered[0]).toHaveAttribute("data-subtitle", "abcdef01");
  });

  it("surfaces a relay failure through the error view", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({
        searchMessages: vi.fn(async () => {
          throw new Error("Relay rejected the request (status 401)");
        }),
      }),
    );
    render(<Command />);
    type("hello");
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Relay rejected the request (status 401)",
      ),
    );
  });

  it("offers an Open in Buzz action targeting the message's deep link", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    type("hello");
    await waitFor(() => expect(screen.getAllByTestId("list-item").length).toBeGreaterThan(0));

    const open = screen.getAllByTestId("action").find((b) => b.dataset.title === "Open in Buzz");
    expect(open).toBeDefined();
    expect(open).toHaveAttribute("data-target", "buzz://message?channel=chan-1&id=m1");
  });

  it("offers Copy Link carrying the same deep link", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    type("hello");
    await waitFor(() => expect(screen.getAllByTestId("list-item").length).toBeGreaterThan(0));

    const copy = screen.getAllByTestId("action").find((b) => b.dataset.title === "Copy Link");
    expect(copy).toHaveAttribute("data-content", "buzz://message?channel=chan-1&id=m1");
  });

  it("still offers the plain copy actions", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    type("hello");
    await waitFor(() => expect(screen.getAllByTestId("list-item").length).toBeGreaterThan(0));

    const titles = screen.getAllByTestId("action").map((b) => b.dataset.title);
    expect(titles).toContain("Copy Message");
    expect(titles).toContain("Copy Message ID");
  });

  it("omits the link actions for a message that carries no channel id", async () => {
    mocks.getClient.mockReturnValue(fakeClient({ searchMessages: vi.fn(async () => [message({ channelId: "" })]) }));
    render(<Command />);
    type("hello");
    await waitFor(() => expect(screen.getAllByTestId("list-item").length).toBeGreaterThan(0));

    const titles = screen.getAllByTestId("action").map((b) => b.dataset.title);
    expect(titles).not.toContain("Open in Buzz");
    expect(titles).not.toContain("Copy Link");
    // The message itself is still copyable, so the row is never a dead end.
    expect(titles).toContain("Copy Message");
  });
});
