/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { showToast, Toast } from "@raycast/api";
// `push` is a stub-only test helper that the real @raycast/api package does
// not declare, so it is imported by relative path rather than through the
// "@raycast/api" specifier (which vitest aliases to this same file for
// runtime resolution; see vitest.config.ts). This keeps `tsc` type-checking
// the rest of the import against the real package's types.
import { push } from "../test/raycast-api-stub";
import type { Channel, DirectMessage, Person } from "./lib/types";

const mocks = vi.hoisted(() => ({ getClient: vi.fn(), searchPeople: vi.fn() }));
vi.mock("./lib/preferences", () => ({ getClient: mocks.getClient }));
vi.mock("./lib/directory", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/directory")>()),
  searchPeople: mocks.searchPeople,
}));

import Command from "./send-message";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClient.mockReset();
  mocks.searchPeople.mockReset();
  mocks.searchPeople.mockResolvedValue([]);
});

const CHANNELS: Channel[] = [
  { id: "chan-1", name: "general" },
  { id: "chan-2", name: "random" },
];

const DMS: DirectMessage[] = [{ channelId: "dm-1", participants: ["aa".repeat(32)], name: "Ada" }];

const PEOPLE: Person[] = [{ pubkey: "bb".repeat(32), name: "Bo" }];

function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    listChannels: vi.fn(async () => CHANNELS),
    listDirectMessages: vi.fn(async () => DMS),
    openDirectMessage: vi.fn(async () => "opened-chan"),
    sendMessage: vi.fn(async () => undefined),
    ...overrides,
  };
}

function rows() {
  return Array.from(screen.getAllByTestId("list-item"));
}

function rowTitled(title: string) {
  const row = rows().find((r) => r.getAttribute("data-title") === title);
  if (!row) throw new Error(`no row titled ${title}; have ${rows().map((r) => r.getAttribute("data-title"))}`);
  return row;
}

function search(text: string) {
  fireEvent.change(screen.getByTestId("search-bar"), { target: { value: text } });
}

function typeMessage(text: string) {
  fireEvent.change(screen.getByTestId("field-content"), { target: { value: text } });
}

/** Click the named action inside a given row. */
function act(title: string, actionTitle: string) {
  const action = Array.from(rowTitled(title).querySelectorAll("[data-testid='action']")).find(
    (a) => a.getAttribute("data-title") === actionTitle,
  );
  if (!action) throw new Error(`no action ${actionTitle} in row ${title}`);
  fireEvent.click(action);
}

async function loaded() {
  await waitFor(() => expect(rowTitled("general")).toBeTruthy());
}

describe("Send Message", () => {
  it("lists channels and existing conversations in their own sections", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    await loaded();

    expect(rowTitled("general").getAttribute("data-section")).toBe("Channels");
    expect(rowTitled("random").getAttribute("data-section")).toBe("Channels");
    expect(rowTitled("Ada").getAttribute("data-section")).toBe("Direct Messages");
  });

  it("labels a nameless channel with its id", async () => {
    mocks.getClient.mockReturnValue(fakeClient({ listChannels: vi.fn(async () => [{ id: "chan-9", name: "" }]) }));
    render(<Command />);
    await waitFor(() => expect(rowTitled("chan-9")).toBeTruthy());
  });

  it("shows no People section until something is typed", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();

    expect(rows().some((r) => r.getAttribute("data-section") === "People")).toBe(false);
    expect(mocks.searchPeople).not.toHaveBeenCalled();
  });

  it("searches people once something is typed and lists them", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");

    await waitFor(() => expect(rowTitled("Bo").getAttribute("data-section")).toBe("People"));
    expect(mocks.searchPeople).toHaveBeenCalledWith(expect.anything(), "bo");
  });

  it("hides the People section again once the search is cleared", async () => {
    // usePromise retains its last resolved `data` when `execute` flips back to
    // false (it only aborts the in-flight fetch, it does not clear the result),
    // so the `hasQuery` gate on the section itself is what has to hide the
    // stale rows, not the hook resetting `people.data` back to undefined.
    mocks.getClient.mockReturnValue(fakeClient());
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");
    await waitFor(() => expect(rowTitled("Bo")).toBeTruthy());

    search("");

    await waitFor(() => expect(rows().some((r) => r.getAttribute("data-section") === "People")).toBe(false));
  });

  it("opens the composer for a channel with that channel's id", async () => {
    // "random" (chan-2), not "general" (chan-1): picking the wrong row's id here
    // would otherwise go unnoticed, since both rows exist and only "general"'s
    // description was ever asserted before.
    const client = fakeClient();
    mocks.getClient.mockReturnValue(client);
    render(<Command />);
    await loaded();
    act("random", "Write Message");

    await screen.findByTestId("pushed-view");
    expect(screen.getByTestId("form-description").textContent).toContain("random");
    typeMessage("hello general");
    fireEvent.click(screen.getByTestId("submit"));

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledWith("chan-2", "hello general"));
  });

  it("opens the composer for an existing conversation without publishing anything", async () => {
    const client = fakeClient();
    mocks.getClient.mockReturnValue(client);
    render(<Command />);
    await loaded();
    act("Ada", "Write Message");

    await screen.findByTestId("pushed-view");
    expect(client.openDirectMessage).not.toHaveBeenCalled();
    typeMessage("hi Ada");
    fireEvent.click(screen.getByTestId("submit"));

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledWith("dm-1", "hi Ada"));
  });

  it("opens a conversation before composing when a person is picked", async () => {
    const client = fakeClient();
    mocks.getClient.mockReturnValue(client);
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");
    await waitFor(() => expect(rowTitled("Bo")).toBeTruthy());
    act("Bo", "Write Message");

    await waitFor(() => expect(client.openDirectMessage).toHaveBeenCalledWith("bb".repeat(32)));
    await waitFor(() => expect(push).toHaveBeenCalled());
    const view = push.mock.calls[0][0];
    expect(view.props.channelId).toBe("opened-chan");
    expect(view.props.destination).toBe("Bo");
  });

  it("opens one conversation when Write Message is fired twice before the first resolves", async () => {
    // openDirectMessage is idempotent, so the damage is navigational: a second
    // push stacks a second composer for the same conversation and the user has
    // to press Back twice. openDirectMessage is held open deliberately, so the
    // second click is turned away by the in-flight guard rather than by a
    // fixture that ran out of queued responses.
    let release!: (channelId: string) => void;
    const client = fakeClient({
      openDirectMessage: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            release = resolve;
          }),
      ),
    });
    mocks.getClient.mockReturnValue(client);
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");
    await waitFor(() => expect(rowTitled("Bo")).toBeTruthy());

    act("Bo", "Write Message");
    act("Bo", "Write Message");

    expect(client.openDirectMessage).toHaveBeenCalledTimes(1);
    release("opened-chan");
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(client.openDirectMessage).toHaveBeenCalledTimes(1);
  });

  it("allows another attempt after opening the conversation failed", async () => {
    // The guard must release on failure, or a relay hiccup would leave that
    // person permanently unwritable for the rest of the session.
    const openDirectMessage = vi
      .fn<(pubkey: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("Relay rejected the request: not allowed"))
      .mockResolvedValueOnce("opened-chan");
    mocks.getClient.mockReturnValue(fakeClient({ openDirectMessage }));
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");
    await waitFor(() => expect(rowTitled("Bo")).toBeTruthy());

    act("Bo", "Write Message");
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not open the conversation" })),
    );

    act("Bo", "Write Message");
    await waitFor(() => expect(openDirectMessage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("does not compose when opening the conversation fails", async () => {
    const client = fakeClient({
      openDirectMessage: vi.fn(async () => {
        throw new Error("Relay rejected the request: not allowed");
      }),
    });
    mocks.getClient.mockReturnValue(client);
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");
    await waitFor(() => expect(rowTitled("Bo")).toBeTruthy());
    act("Bo", "Write Message");

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Could not open the conversation",
        message: "Relay rejected the request: not allowed",
      }),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("reports a non-Error open failure as text", async () => {
    const client = fakeClient({
      openDirectMessage: vi.fn(async () => {
        throw "socket closed";
      }),
    });
    mocks.getClient.mockReturnValue(client);
    mocks.searchPeople.mockResolvedValue(PEOPLE);
    render(<Command />);
    await loaded();
    search("bo");
    await waitFor(() => expect(rowTitled("Bo")).toBeTruthy());
    act("Bo", "Write Message");

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "Could not open the conversation",
        message: "socket closed",
      }),
    );
  });

  it("keeps channels visible when the people search fails", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    mocks.searchPeople.mockRejectedValue(new Error("search unavailable"));
    render(<Command />);
    await loaded();
    search("bo");

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "People search failed",
        message: "search unavailable",
      }),
    );
    expect(rowTitled("general")).toBeTruthy();
  });

  it("reports a non-Error search failure as text", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    mocks.searchPeople.mockRejectedValue("boom");
    render(<Command />);
    await loaded();
    search("bo");

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        style: Toast.Style.Failure,
        title: "People search failed",
        message: "boom",
      }),
    );
  });

  it("offers a copy action for a channel id", async () => {
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    await loaded();
    const copy = Array.from(rowTitled("general").querySelectorAll("[data-testid='action']")).find(
      (a) => a.getAttribute("data-kind") === "copy",
    );
    expect(copy?.getAttribute("data-content")).toBe("chan-1");
  });

  it("renders the error view when the relay cannot be reached", async () => {
    mocks.getClient.mockImplementation(() => {
      throw new Error("Cannot reach relay at https://relay.example");
    });
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Cannot reach relay at https://relay.example",
      ),
    );
  });

  it("renders the error view when the channel fetch rejects", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({
        listChannels: vi.fn(async () => {
          throw new Error("Relay rejected the request: not allowed");
        }),
      }),
    );
    render(<Command />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-view")).toHaveAttribute(
        "data-description",
        "Relay rejected the request: not allowed",
      ),
    );
  });

  it("keeps channels usable when the conversation fetch rejects", async () => {
    // Posting to a channel shipped long before DMs existed, so a failing DM
    // query must not take the whole command down with it.
    mocks.getClient.mockReturnValue(
      fakeClient({
        listDirectMessages: vi.fn(async () => {
          throw new Error("Relay rejected the request: not allowed");
        }),
      }),
    );
    render(<Command />);
    await loaded();

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Could not load conversations",
      message: "Relay rejected the request: not allowed",
    });
    expect(rowTitled("general").getAttribute("data-section")).toBe("Channels");
    expect(rows().some((r) => r.getAttribute("data-section") === "Direct Messages")).toBe(false);
    expect(screen.queryByTestId("empty-view")).toBeNull();
  });

  it("reports a non-Error conversation failure as text", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({
        listDirectMessages: vi.fn(async () => {
          throw "socket closed";
        }),
      }),
    );
    render(<Command />);
    await loaded();

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Could not load conversations",
      message: "socket closed",
    });
  });

  it("asks Raycast for native filtering, since onSearchTextChange otherwise turns it off", async () => {
    // The stub cannot reproduce Raycast's own filtering, so this only pins the
    // prop the command passes rather than the filtering behaviour it produces.
    mocks.getClient.mockReturnValue(fakeClient());
    render(<Command />);
    await loaded();
    expect(screen.getByTestId("list")).toHaveAttribute("data-filtering", "true");
  });

  it("shows an empty state when there is nothing to write to", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({ listChannels: vi.fn(async () => []), listDirectMessages: vi.fn(async () => []) }),
    );
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Nothing to write to"));
    expect(screen.getByTestId("empty-view")).toHaveAttribute(
      "data-description",
      "No channels or conversations on this relay",
    );
  });

  it("says the search matched nothing, not that the relay is bare, once a query is typed", async () => {
    // The relay loaded fine; the query simply matched nothing. Telling the user
    // there is nothing on the relay would be a different, wrong diagnosis.
    mocks.getClient.mockReturnValue(
      fakeClient({ listChannels: vi.fn(async () => []), listDirectMessages: vi.fn(async () => []) }),
    );
    render(<Command />);
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Nothing to write to"));

    search("nothing matches this");

    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matches"));
    expect(screen.getByTestId("empty-view").getAttribute("data-description")).toMatch(/match/i);
  });

  it("goes back to the relay-is-empty copy when the query is cleared", async () => {
    mocks.getClient.mockReturnValue(
      fakeClient({ listChannels: vi.fn(async () => []), listDirectMessages: vi.fn(async () => []) }),
    );
    render(<Command />);
    search("nothing matches this");
    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "No matches"));

    search("");

    await waitFor(() => expect(screen.getByTestId("empty-view")).toHaveAttribute("data-title", "Nothing to write to"));
  });
});
