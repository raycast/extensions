/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { showToast, Toast } from "@raycast/api";
import { ChannelMessages } from "./channel-messages";
import type { BuzzClient } from "../lib/buzz-client";
import type { Channel, Message } from "../lib/types";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const CHANNEL: Channel = { id: "chan-1", name: "general", about: "the main room" };

function message(partial: Partial<Message>): Message {
  return {
    id: "m1",
    author: "abcdef0123456789",
    content: "hello",
    createdAt: 1700000000,
    channelId: "chan-1",
    replyCount: 0,
    ...partial,
  };
}

// Wraps a message array into the shape BuzzClient.getMessages actually returns.
// Defaults fetchedCount to messages.length, which is right for every fixture
// here except the "all replies hidden" case, which passes an explicit count.
function result(messages: Message[], fetchedCount = messages.length) {
  return { messages, fetchedCount };
}

function fakeClient(overrides: Partial<Record<keyof BuzzClient, unknown>> = {}) {
  return {
    getMessages: vi.fn(async () => result([message({})])),
    react: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as BuzzClient;
}

async function items() {
  return waitFor(() => {
    const found = screen.getAllByTestId("list-item");
    expect(found.length).toBeGreaterThan(0);
    return found;
  });
}

describe("ChannelMessages", () => {
  it("loads the messages for the channel it was given", async () => {
    const client = fakeClient();
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await waitFor(() => expect(client.getMessages).toHaveBeenCalledWith("chan-1"));
  });

  it("renders each message with a truncated author as the subtitle", async () => {
    const client = fakeClient({
      getMessages: vi.fn(async () =>
        result([message({ id: "m1", content: "first" }), message({ id: "m2", content: "second" })]),
      ),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const rendered = await items();
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toHaveAttribute("data-title", "first");
    // The author is shortened to 8 characters for display.
    expect(rendered[0]).toHaveAttribute("data-subtitle", "abcdef01");
  });

  it("falls back to a placeholder title for an empty message body", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => result([message({ content: "" })])) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const rendered = await items();
    expect(rendered[0]).toHaveAttribute("data-title", "(no content)");
  });

  it("shows the empty view when the channel has no messages at all", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => result([], 0)) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No messages to show"));
    expect(screen.getByTestId("empty-view")).toHaveAttribute(
      "data-description",
      "This channel has no messages yet, or none match the current search.",
    );
    expect(screen.queryAllByTestId("list-item")).toHaveLength(0);
  });

  it("does not assert the channel is empty, since native filtering can empty it too", async () => {
    // This view has no onSearchTextChange (adding one would turn Raycast's own
    // filtering off), so it cannot tell "no messages" from "nothing matched".
    // The copy must not claim either one outright.
    const client = fakeClient({ getMessages: vi.fn(async () => result([], 0)) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const emptyView = await waitFor(() => screen.getByTestId("empty-view"));
    expect(screen.getByTestId("list")).toHaveAttribute("data-native-filtering", "true");
    expect(emptyView.getAttribute("data-description")).toMatch(/match/i);
    expect(emptyView.getAttribute("data-description")).not.toBe("This channel has no messages yet");
  });

  it("says the recent messages are all thread replies when the fetched window held events but no visible root", async () => {
    // 250 replies fetched, none survive filtering because their root fell
    // outside the window: the channel is not empty, but this drill-in is.
    const client = fakeClient({ getMessages: vi.fn(async () => result([], 250)) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Only thread replies here"),
    );
    const emptyView = screen.getByTestId("empty-view");
    expect(emptyView.getAttribute("data-description")).toMatch(/repl/i);
    expect(emptyView.getAttribute("data-description")).not.toMatch(/no messages yet/i);
    expect(screen.queryAllByTestId("list-item")).toHaveLength(0);
  });

  it("keeps Open in Buzz reachable when the fetched window is all thread replies", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => result([], 250)) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const emptyView = await waitFor(() => screen.getByTestId("empty-view"));
    const open = within(emptyView)
      .getAllByTestId("action")
      .find((b) => b.dataset.title === "Open in Buzz");
    expect(open).toBeDefined();
    // Anchored to a message id that cannot exist; Buzz falls back to opening
    // the channel itself, per buildChannelLink.
    expect(open).toHaveAttribute("data-target", `buzz://message?channel=chan-1&id=${"0".repeat(64)}`);
  });

  it("titles the view with the channel name", async () => {
    render(<ChannelMessages client={fakeClient()} channel={CHANNEL} />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-navigation-title", "general"));
  });

  it("falls back to the channel id when the channel has no name", async () => {
    render(<ChannelMessages client={fakeClient()} channel={{ id: "chan-2", name: "" }} />);
    await waitFor(() => expect(screen.getByTestId("list")).toHaveAttribute("data-navigation-title", "chan-2"));
  });

  it("surfaces a load failure through the error view", async () => {
    const client = fakeClient({
      getMessages: vi.fn(async () => {
        throw new Error("Cannot reach relay at https://relay.test");
      }),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Cannot reach relay at https://relay.test",
      ),
    );
  });

  it("offers Open in Buzz as the first action, targeting the message's deep link", async () => {
    render(<ChannelMessages client={fakeClient()} channel={CHANNEL} />);
    await items();
    const actions = screen.getAllByTestId("action");
    expect(actions[0]).toHaveAttribute("data-title", "Open in Buzz");
    expect(actions[0]).toHaveAttribute("data-target", "buzz://message?channel=chan-1&id=m1");
  });

  it("gives Open in Buzz an explicit icon, rather than Action.Open's Finder-glyph default", async () => {
    render(<ChannelMessages client={fakeClient()} channel={CHANNEL} />);
    await items();
    const open = screen.getAllByTestId("action").find((b) => b.dataset.title === "Open in Buzz");
    expect(open).toHaveAttribute("data-icon", "AppWindow");
  });

  it("offers Copy Link carrying the same deep link", async () => {
    render(<ChannelMessages client={fakeClient()} channel={CHANNEL} />);
    await items();
    const copy = screen.getAllByTestId("action").find((b) => b.dataset.title === "Copy Link");
    expect(copy).toHaveAttribute("data-content", "buzz://message?channel=chan-1&id=m1");
  });

  it("falls back to the channel being viewed when the message carries no channel id", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => result([message({ channelId: "" })])) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();
    const open = screen.getAllByTestId("action").find((b) => b.dataset.title === "Open in Buzz");
    // The h tag is authoritative where it exists; inside a channel we already
    // know which one we are looking at, so a tagless message is still linkable.
    expect(open).toHaveAttribute("data-target", "buzz://message?channel=chan-1&id=m1");
  });

  it("keeps React (Like) available, just not on Enter", async () => {
    const client = fakeClient();
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();
    const react = screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)");
    expect(react).toBeDefined();
    fireEvent.click(react!);
    await waitFor(() => expect(client.react).toHaveBeenCalledWith("m1", "chan-1", "+"));
  });
});

describe("ChannelMessages react action", () => {
  it("publishes a NIP-25 '+' like for the message and channel", async () => {
    const client = fakeClient();
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();

    fireEvent.click(screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!);

    await waitFor(() => expect(client.react).toHaveBeenCalledWith("m1", "chan-1", "+"));
  });

  it("confirms a successful reaction with a success toast", async () => {
    render(<ChannelMessages client={fakeClient()} channel={CHANNEL} />);
    await items();

    fireEvent.click(screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!);

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ style: Toast.Style.Success, title: "Reaction sent" }),
      ),
    );
  });

  it("reloads the message list after a successful reaction", async () => {
    const client = fakeClient();
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();
    expect(client.getMessages).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!);

    await waitFor(() => expect(client.getMessages).toHaveBeenCalledTimes(2));
  });

  it("publishes one reaction when React (Like) is fired twice before the first resolves", async () => {
    // A kind:7 reaction is an ordinary, non-replaceable event: a second publish
    // is a second reaction, not an overwrite. react() is held open deliberately,
    // so the second click is turned away by the in-flight guard rather than by a
    // fixture that ran out of queued responses.
    let release!: () => void;
    const client = fakeClient({
      react: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            release = () => resolve();
          }),
      ),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();

    const react = screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!;
    fireEvent.click(react);
    fireEvent.click(react);

    expect(client.react).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(client.getMessages).toHaveBeenCalledTimes(2));
    expect(client.react).toHaveBeenCalledTimes(1);
  });

  it("allows reacting again after the relay rejected the first attempt", async () => {
    // The guard must release on failure, or a rejected reaction could never be
    // retried without leaving and re-entering the channel.
    const react = vi
      .fn<(id: string, channelId: string, content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Relay rejected the request: restricted"))
      .mockResolvedValueOnce(undefined);
    const client = fakeClient({ react });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();

    const like = () =>
      fireEvent.click(screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!);
    like();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Reaction failed" })));

    like();
    await waitFor(() => expect(react).toHaveBeenCalledTimes(2));
  });

  it("reports a rejected reaction with the relay's reason and does not reload", async () => {
    const client = fakeClient({
      react: vi.fn(async () => {
        throw new Error("Relay rejected the request: restricted");
      }),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();

    fireEvent.click(screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!);

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Failure,
          title: "Reaction failed",
          message: "Relay rejected the request: restricted",
        }),
      ),
    );
    // The list is only revalidated on success.
    expect(client.getMessages).toHaveBeenCalledTimes(1);
  });

  it("stringifies a non-Error rejection into the failure toast", async () => {
    const client = fakeClient({
      react: vi.fn(async () => {
        throw "socket closed";
      }),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    await items();

    fireEvent.click(screen.getAllByTestId("action").find((b) => b.dataset.title === "React (Like)")!);

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ message: "socket closed" })));
  });

  it("offers copy actions for the deep link, the message body and its id, in that order", async () => {
    render(<ChannelMessages client={fakeClient()} channel={CHANNEL} />);
    await items();

    const copies = screen.getAllByTestId("action").filter((b) => b.dataset.kind === "copy");
    expect(copies.map((b) => b.dataset.content)).toEqual(["buzz://message?channel=chan-1&id=m1", "hello", "m1"]);
  });

  it("shows a reply count when a message has replies", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => result([message({ replyCount: 6 })])) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const rendered = await items();
    expect(rendered[0]).toHaveAttribute("data-accessories", expect.stringContaining("6 replies"));
  });

  it("uses the singular for exactly one reply", async () => {
    const client = fakeClient({ getMessages: vi.fn(async () => result([message({ replyCount: 1 })])) });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const rendered = await items();
    expect(rendered[0]).toHaveAttribute("data-accessories", expect.stringContaining("1 reply"));
  });

  it("shows no reply accessory when there are none, while still showing the timestamp", async () => {
    const client = fakeClient({
      getMessages: vi.fn(async () => result([message({ replyCount: 0, createdAt: 1700000000 })])),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const rendered = await items();
    const accessories = rendered[0].getAttribute("data-accessories") ?? "";
    expect(accessories).not.toContain("repl");
    expect(accessories).toContain(new Date(1700000000 * 1000).toISOString());
  });

  it("puts the reply count accessory before the timestamp accessory", async () => {
    const client = fakeClient({
      getMessages: vi.fn(async () => result([message({ replyCount: 3, createdAt: 1700000000 })])),
    });
    render(<ChannelMessages client={client} channel={CHANNEL} />);
    const rendered = await items();
    const accessories = rendered[0].getAttribute("data-accessories") ?? "";
    const countIndex = accessories.indexOf("3 replies");
    const dateIndex = accessories.indexOf(new Date(1700000000 * 1000).toISOString());
    expect(countIndex).toBeGreaterThanOrEqual(0);
    expect(dateIndex).toBeGreaterThan(countIndex);
  });
});
