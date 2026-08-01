/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { Channel } from "./lib/types";

const mocks = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock("./lib/preferences", () => ({ getClient: mocks.getClient }));

import Command from "./search-channels";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClient.mockReset();
});

const CHANNELS: Channel[] = [
  { id: "uuid-1", name: "general", about: "the main room" },
  { id: "uuid-2", name: "random", about: undefined },
];

function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    listChannels: vi.fn(async () => CHANNELS),
    getMessages: vi.fn(async () => ({ messages: [], fetchedCount: 0 })),
    ...overrides,
  };
}

async function items() {
  return waitFor(() => {
    const found = screen.getAllByTestId("list-item");
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
}

describe("Search Channels", () => {
  it("lists the channels from the relay", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    const rendered = await items();
    expect(rendered.map((el) => el.dataset.title)).toEqual(["general", "random"]);
    expect(rendered[0]).toHaveAttribute("data-subtitle", "the main room");
  });

  it("falls back to the channel id when a channel has no name", async () => {
    mocks.getClient.mockReturnValue(fakeClient({ listChannels: vi.fn(async () => [{ id: "uuid-3", name: "" }]) }));
    render(<Command />);
    const rendered = await items();
    expect(rendered[0]).toHaveAttribute("data-title", "uuid-3");
  });

  it("shows the empty view when the relay has no channels", async () => {
    mocks.getClient.mockReturnValue(fakeClient({ listChannels: vi.fn(async () => []) }));
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No channels to show"));
  });

  it("does not assert the relay is bare, since native filtering can empty the list too", async () => {
    // No onSearchTextChange here, so Raycast filters the rows itself and this
    // command never sees the query. Adding one to tell "no channels" apart from
    // "nothing matched" would silently turn that filtering off, so the copy has
    // to be true in both states instead.
    mocks.getClient.mockReturnValue(fakeClient({ listChannels: vi.fn(async () => []) }));
    render(<Command />);
    const emptyView = await waitFor(() => screen.getByTestId("empty-view"));
    expect(screen.getByTestId("list")).toHaveAttribute("data-native-filtering", "true");
    expect(emptyView.getAttribute("data-description")).toMatch(/match/i);
    expect(emptyView.getAttribute("data-description")).not.toBe("No channels found on this relay");
  });

  it("shows the error view when preferences are not configured", async () => {
    mocks.getClient.mockImplementation(() => {
      throw new Error("Set your Buzz relay URL (https:// or wss://) in extension preferences");
    });
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Set your Buzz relay URL (https:// or wss://) in extension preferences",
      ),
    );
  });

  it("shows the error view when the relay is unreachable", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({
        listChannels: vi.fn(async () => {
          throw new Error("Cannot reach relay at https://relay.test");
        }),
      }),
    );
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Cannot reach relay at https://relay.test",
      ),
    );
  });

  it("offers a copy action carrying the channel id", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    await items();
    const copies = screen.getAllByTestId("action").filter((b) => b.dataset.kind === "copy");
    expect(copies.map((b) => b.dataset.content)).toEqual(["uuid-1", "uuid-2"]);
  });

  it("offers Open in Buzz as the first action, using the anchorless channel link", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    await items();
    const actions = screen.getAllByTestId("action");
    expect(actions[0]).toHaveAttribute("data-title", "Open in Buzz");
    expect(actions[0]).toHaveAttribute("data-target", `buzz://message?channel=uuid-1&id=${"0".repeat(64)}`);
  });

  it("keeps the in-Raycast drill-in, renamed so it does not compete for the word open", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => ({ messages: [], fetchedCount: 0 })) });
    mocks.getClient.mockReturnValue(client);
    render(<Command />);
    await items();

    const show = screen.getAllByTestId("action").find((b) => b.dataset.title === "Show Messages");
    expect(show).toBeDefined();
    fireEvent.click(show!);
    await waitFor(() => expect(client.getMessages).toHaveBeenCalledWith("uuid-1"));
  });

  it("does not offer Copy Link for a channel", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    await items();
    // The channel link carries a sentinel message id: safe to open, but it
    // would paste into Buzz as a link to a message that does not exist.
    expect(screen.getAllByTestId("action").map((b) => b.dataset.title)).not.toContain("Copy Link");
  });
});
