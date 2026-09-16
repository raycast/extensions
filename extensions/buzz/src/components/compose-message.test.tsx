/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { showToast, popToRoot, Toast } from "@raycast/api";
import type { BuzzClient } from "../lib/buzz-client";
import { ComposeMessage } from "./compose-message";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function fakeClient(overrides: Record<string, unknown> = {}) {
  return { sendMessage: vi.fn(async () => undefined), ...overrides } as unknown as BuzzClient;
}

function typeMessage(text: string) {
  fireEvent.change(screen.getByTestId("field-content"), { target: { value: text } });
}

function submit() {
  fireEvent.click(screen.getByTestId("submit"));
}

describe("ComposeMessage", () => {
  it("names the destination it will send to", () => {
    render(<ComposeMessage client={fakeClient()} channelId="chan-1" destination="general" />);
    expect(screen.getByTestId("form-description").textContent).toContain("general");
  });

  it("sends the typed message to the given channel", async () => {
    const client = fakeClient();
    render(<ComposeMessage client={client} channelId="chan-1" destination="general" />);
    typeMessage("hello there");
    submit();

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledWith("chan-1", "hello there"));
    expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Message sent" });
    expect(popToRoot).toHaveBeenCalled();
  });

  it("refuses to send a message that is only whitespace", async () => {
    const client = fakeClient();
    render(<ComposeMessage client={client} channelId="chan-1" destination="general" />);
    typeMessage("   ");
    submit();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Failure, title: "Message is empty" }),
    );
    expect(client.sendMessage).not.toHaveBeenCalled();
    expect(popToRoot).not.toHaveBeenCalled();
  });

  it("surfaces the relay's reason when the send fails and stays open", async () => {
    const client = fakeClient({
      sendMessage: vi.fn(async () => {
        throw new Error("Relay rejected the request: read-only");
      }),
    });
    render(<ComposeMessage client={client} channelId="chan-1" destination="general" />);
    typeMessage("hello");
    submit();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Send failed",
        message: "Relay rejected the request: read-only",
      }),
    );
    expect(popToRoot).not.toHaveBeenCalled();
  });

  it("sends once when submit is fired twice before the first send resolves", async () => {
    // A public message with no delete: the second Enter press must not publish
    // a duplicate. sendMessage is held open deliberately, so the second submit
    // is rejected by the in-flight guard rather than by a spent fixture.
    let release!: () => void;
    const client = fakeClient({
      sendMessage: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            release = () => resolve();
          }),
      ),
    });
    render(<ComposeMessage client={client} channelId="chan-1" destination="general" />);
    typeMessage("hello twice");
    submit();
    submit();

    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(popToRoot).toHaveBeenCalledTimes(1));
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("allows a retry after a failed send, so the guard is not a one-way latch", async () => {
    const sendMessage = vi
      .fn<(channelId: string, content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Relay rejected the request: read-only"))
      .mockResolvedValueOnce(undefined);
    const client = fakeClient({ sendMessage });
    render(<ComposeMessage client={client} channelId="chan-1" destination="general" />);
    typeMessage("hello");
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Send failed" })));

    submit();
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    expect(popToRoot).toHaveBeenCalled();
  });

  it("reports a non-Error rejection as text", async () => {
    const client = fakeClient({
      sendMessage: vi.fn(async () => {
        throw "socket closed";
      }),
    });
    render(<ComposeMessage client={client} channelId="chan-1" destination="general" />);
    typeMessage("hello");
    submit();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Send failed",
        message: "socket closed",
      }),
    );
  });
});
