// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { resolveAccount, saveAccount, setDefaultAccount } from "@/lib/accounts";
import { listRecovery, rememberDraft } from "@/lib/recovery";

import useDrafts from "@/hooks/useDrafts";

import AccountSetup from "@/components/AccountSetup";
import CreateDraftForm from "@/components/CreateDraftForm";
import CreateDraft from "@/create-substack-draft";
import ListMyDrafts from "@/list-my-drafts";
import ManageAccounts from "@/manage-accounts";

import {
  LocalStorage,
  cache,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  open,
  pop,
  showToast,
  storage,
} from "./mocks/raycast";

vi.mock("node:fs/promises", () => {
  const readFile = vi.fn();
  return { readFile, default: { readFile } };
});
const account = { id: "first", label: "First", publication: "example", sessionCookie: "synthetic" };
const other = { ...account, id: "second", label: "Second", sessionCookie: "other" };
afterEach(cleanup);
beforeEach(() => {
  storage.clear();
  cache.clear();
  getPreferenceValues.mockReturnValue({});
});
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function fill() {
  change("Title", "Newsletter");
  change("Markdown", "Body");
}
function serveCreation(failure = false) {
  let body: Record<string, unknown> = {};
  let id = 40;
  const fetchMock = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    if (String(url).endsWith("publication_user")) return Response.json({ pub_users: [{ user_id: 1 }] });
    if (options?.method === "POST") return Response.json({ id: ++id });
    if (options?.method === "PUT") {
      body = JSON.parse(String(options.body));
      return Response.json({}, { status: failure ? 500 : 200 });
    }
    return Response.json({ ...body, is_published: false });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
function form() {
  return render(<CreateDraftForm accounts={[account, other]} accountId="first" onAccountChange={vi.fn()} />);
}
test("Create Draft immediately opens the form and imports legacy history", async () => {
  getPreferenceValues.mockReturnValue(account as any);
  cache.set("created-drafts", [
    { id: 42, editorUrl: "https://example.substack.com/publish/post/42", title: "Legacy", verified: false },
  ]);
  render(<CreateDraft />);
  await screen.findByLabelText("Title");
  expect(screen.getByRole("button", { name: "Create Draft" })).toBeTruthy();
  expect(storage.get("substack.accounts.v1")).toContain("Legacy");
});
test("empty setup and migration errors provide account management and refresh", async () => {
  render(<CreateDraft />);
  await screen.findByText(/Add a connection/);
  cleanup();
  LocalStorage.setItem.mockRejectedValueOnce(new Error("failed"));
  render(<CreateDraft />);
  await screen.findByText(/Could not save/);
  fireEvent.click(screen.getByRole("button", { name: "Refresh Accounts" }));
  await screen.findByText(/Add a connection/);
});
test("form validates title, rejects combined file and text, handles file read failures", async () => {
  await saveAccount(account);
  form();
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await screen.findByText("Enter a title.");
  fill();
  change("Markdown File", "/synthetic.md");
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await waitFor(() =>
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("rather than") }),
    ),
  );
  change("Markdown", "");
  vi.mocked(readFile).mockRejectedValueOnce(new Error("Could not read file"));
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await waitFor(() =>
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ message: "Could not read file" })),
  );
  expect(fetch).not.toHaveBeenCalled();
});
test("file input and two consecutive saves persist both recovery links", async () => {
  await saveAccount(account);
  const fetchMock = serveCreation();
  vi.mocked(readFile).mockResolvedValue("File body");
  const onSaved = vi.fn();
  render(<CreateDraftForm accounts={[account]} accountId="first" onAccountChange={vi.fn()} onSaved={onSaved} />);
  change("Title", "File newsletter");
  change("Markdown File", "/synthetic.md");
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  change("Markdown File", "");
  change("Markdown", "Pasted body");
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
  expect(await listRecovery("first")).toHaveLength(2);
  expect(fetchMock.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(2);
  expect(open).toHaveBeenCalled();
});
test("duplicate submissions are blocked while the selected account is fixed", async () => {
  await saveAccount(account);
  let release!: (value: Response) => void;
  const fetchMock = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((r) => {
        release = r;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  form();
  fill();
  const button = screen.getByRole("button", { name: "Create Draft" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("combobox", { name: "Account" })).toBeNull();
  await act(async () => release(Response.json({}, { status: 401 })));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Account" })).toBeTruthy());
});
test("partial saves show recovery actions and do not create another draft", async () => {
  await saveAccount(account);
  const fetchMock = serveCreation(true);
  form();
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await screen.findByText(/A draft was created/);
  fireEvent.click(screen.getByRole("button", { name: "Open Draft in Substack" }));
  expect(open).toHaveBeenCalledWith("https://example.substack.com/publish/post/41");
  fireEvent.click(screen.getByRole("button", { name: "View Drafts" }));
  expect(pop).toHaveBeenCalled();
  expect(fetchMock.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(1);
});
test("editor launch failure reports a saved draft and retains its link", async () => {
  await saveAccount(account);
  serveCreation();
  open.mockRejectedValueOnce(new Error("Browser unavailable"));
  form();
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Draft saved" })));
  expect((await listRecovery("first"))[0].verified).toBe(true);
});
test("final persistence failure shows recovery instead of a retryable creation form", async () => {
  await saveAccount(account);
  serveCreation();
  LocalStorage.setItem
    .mockImplementationOnce(async (key, value) => {
      storage.set(key, value);
    })
    .mockRejectedValueOnce(new Error("failed"));
  form();
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await screen.findByText(/A draft was created/);
  expect(screen.queryByLabelText("Title")).toBeNull();
});
test("account selection is explicit before creating", async () => {
  await saveAccount(account);
  const onChange = vi.fn();
  render(<CreateDraftForm accounts={[account, other]} accountId="" onAccountChange={onChange} />);
  change("Account", "second");
  expect(onChange).toHaveBeenCalledWith("second");
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Create Draft" }));
  await waitFor(() => expect(showToast).toHaveBeenCalled());
  expect(fetch).not.toHaveBeenCalled();
});
test("draft list paginates remote results, merges recovery and refreshes", async () => {
  await saveAccount(account);
  await rememberDraft("first", "Remote", { id: 42, editorUrl: "https://example.substack.com/publish/post/42" }, false);
  await rememberDraft("first", "Absent", { id: 99, editorUrl: "https://example.substack.com/publish/post/99" }, true);
  const mock = vi.fn(async (url: RequestInfo | URL) => {
    const offset = Number(new URL(String(url)).searchParams.get("offset"));
    return Response.json({
      posts: [
        {
          id: offset ? 43 : 42,
          draft_title: offset ? "Second page" : "Remote",
          type: "newsletter",
          is_published: false,
        },
      ],
      offset,
      limit: 25,
      total: 26,
    });
  });
  vi.stubGlobal("fetch", mock);
  render(<ListMyDrafts />);
  await screen.findByRole("heading", { name: "Remote" });
  expect(screen.getByText("Needs Review")).toBeTruthy();
  expect(screen.getByText("Saved recovery link")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Load More" }));
  await screen.findByRole("heading", { name: "Second page" });
  fireEvent.click(screen.getAllByRole("button", { name: "Refresh Drafts" })[0]);
  await waitFor(() => expect(mock).toHaveBeenCalledTimes(3));
  fireEvent.click(
    within(screen.getByRole("heading", { name: "Remote" }).closest("article")!).getByRole("button", {
      name: "Open Draft in Substack",
    }),
  );
  expect(open).toHaveBeenCalledWith("https://example.substack.com/publish/post/42");
  expect(mock).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();
  fireEvent.click(
    within(screen.getByRole("heading", { name: "Absent" }).closest("article")!).getByRole("button", {
      name: "Open Draft in Substack",
    }),
  );
  expect(open).toHaveBeenCalledWith("https://example.substack.com/publish/post/99");
  expect(mock).toHaveBeenCalledTimes(3);
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "no matching drafts" } });
  expect(screen.getAllByRole("button", { name: "Create Draft" }).length).toBeGreaterThan(0);
});
test("list empty, errors, no accounts and no default keep creation and setup reachable", async () => {
  render(<ListMyDrafts />);
  await screen.findByText(/import legacy preferences/);
  cleanup();
  await saveAccount(account);
  await saveAccount(other);
  render(<ListMyDrafts />);
  await screen.findAllByText("Select an account");
  change("Select a Substack account", "first");
  await screen.findByRole("heading", { name: "Could not refresh drafts" });
  cleanup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ posts: [], offset: 0, limit: 25, total: 0 })));
  await setDefaultAccount("first");
  render(<ListMyDrafts />);
  await screen.findByText("No unpublished drafts");
  expect(screen.getAllByRole("button", { name: "Create Draft" })).toHaveLength(2);
});
test("late responses from the previous login never appear after switching accounts", async () => {
  await saveAccount(account);
  await saveAccount(other);
  let release!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) =>
      new Headers(options?.headers).get("Cookie")?.includes("other")
        ? Response.json({
            posts: [{ id: 7, type: "newsletter", is_published: false, draft_title: "Second login" }],
            offset: 0,
            limit: 25,
            total: 1,
          })
        : new Promise<Response>((r) => {
            release = r;
          }),
    ),
  );
  const { result, rerender } = renderHook(({ selected }) => useDrafts(selected), {
    initialProps: { selected: account },
  });
  await waitFor(() => expect(release).toBeTypeOf("function"));
  rerender({ selected: other });
  expect(result.current.drafts).toEqual([]);
  await waitFor(() => expect(result.current.drafts[0]?.title).toBe("Second login"));
  await act(async () =>
    release(
      Response.json({
        posts: [{ id: 8, type: "newsletter", is_published: false, draft_title: "First login" }],
        offset: 0,
        limit: 25,
        total: 1,
      }),
    ),
  );
  expect(result.current.drafts[0]?.title).toBe("Second login");
});
test("management adds, edits, defaults and removes accounts with password fields", async () => {
  render(<ManageAccounts />);
  fireEvent.click(screen.getByRole("button", { name: "Add Account" }));
  change("Account Label (Optional)", "First");
  change("Publication", "example");
  change("Substack Session Cookie", "synthetic");
  expect(screen.getByLabelText("Substack Session Cookie").getAttribute("type")).toBe("password");
  fireEvent.click(screen.getByRole("button", { name: "Save Account" }));
  await screen.findByRole("heading", { name: "First" });
  fireEvent.click(screen.getByRole("button", { name: "Set as Default" }));
  await screen.findByText("Default");
  cleanup();
  render(<ManageAccounts />);
  await screen.findByRole("heading", { name: "First" });
  fireEvent.click(screen.getByRole("button", { name: "Edit Account" }));
  await waitFor(() =>
    expect((screen.getByLabelText("Account Label (Optional)") as HTMLInputElement).value).toBe("First"),
  );
  change("Account Label (Optional)", "Renamed");
  fireEvent.click(screen.getByRole("button", { name: "Save Account" }));
  await screen.findByRole("heading", { name: "Renamed" });
  confirmAlert.mockResolvedValueOnce(false);
  fireEvent.click(screen.getByRole("button", { name: "Remove Account" }));
  await waitFor(() => expect(confirmAlert).toHaveBeenCalled());
  expect(screen.getByRole("heading", { name: "Renamed" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove Account" }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Renamed" })).toBeNull());
});
test("account label is last and defaults to publication without a connect cookie", async () => {
  render(<ManageAccounts />);
  fireEvent.click(screen.getByRole("button", { name: "Add Account" }));
  expect(
    Array.from(screen.getByLabelText("form").querySelectorAll("input")).map((field) =>
      field.getAttribute("aria-label"),
    ),
  ).toEqual([
    "Publication",
    "Substack Session Cookie",
    "Connect Session Cookie (Optional)",
    "Account Label (Optional)",
  ]);
  expect(screen.getByLabelText("Connect Session Cookie (Optional)").getAttribute("type")).toBe("password");
  change("Publication", "https://example.substack.com");
  change("Substack Session Cookie", "synthetic");
  fireEvent.click(screen.getByRole("button", { name: "Save Account" }));
  await screen.findByRole("heading", { name: "example" });
  expect((await resolveAccount()).label).toBe("example");
  expect((await resolveAccount()).connectCookie).toBeUndefined();
});
test("account form validation and storage errors are visible", async () => {
  render(<ManageAccounts />);
  fireEvent.click(screen.getByRole("button", { name: "Add Account" }));
  fireEvent.click(screen.getByRole("button", { name: "Save Account" }));
  await screen.findByText("Enter a publication.");
  change("Account Label (Optional)", "First");
  change("Publication", "example");
  change("Substack Session Cookie", "synthetic");
  LocalStorage.setItem.mockRejectedValueOnce(new Error("failed"));
  fireEvent.click(screen.getByRole("button", { name: "Save Account" }));
  await waitFor(() =>
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not save account" })),
  );
});
test("corrupt account storage displays recovery message and setup actions", async () => {
  storage.set("substack.accounts.v1", "{");
  render(<ListMyDrafts />);
  await screen.findByText(/Saved Substack data is invalid/);
  cleanup();
  render(<AccountSetup message="Setup" onRefresh={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Import Legacy Preferences" }));
  expect(launchCommand).toHaveBeenCalledWith(expect.objectContaining({ name: "create-substack-draft" }));
});
