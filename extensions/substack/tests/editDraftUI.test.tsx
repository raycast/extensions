// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { saveAccount } from "@/lib/accounts";
import { draftBody } from "@/lib/createDraft";

import EditDraftForm from "@/components/EditDraftForm";
import ListMyDrafts from "@/list-my-drafts";

import { open, pop, showToast, storage } from "./mocks/raycast";

const account = { id: "first", label: "First", publication: "example", sessionCookie: "synthetic" };
const url = "https://example.substack.com/publish/post/42";
const raw = {
  id: 42,
  type: "newsletter",
  is_published: false,
  draft_title: "Original",
  draft_subtitle: "Subtitle",
  draft_body: draftBody("Original body"),
  draftBylines: [{ id: 7 }],
};
afterEach(cleanup);
beforeEach(async () => {
  storage.clear();
  await saveAccount(account);
});
function server(body = raw.draft_body, failWrite = false) {
  let current = { ...raw, draft_body: body };
  const mock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).includes("post_management"))
      return Response.json({ posts: [current], offset: 0, limit: 25, total: 1 });
    if (init?.method === "PUT") {
      if (failWrite) return Response.json({}, { status: 500 });
      current = { ...current, ...JSON.parse(String(init.body)) };
    }
    return Response.json(current);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}
function form() {
  render(<EditDraftForm accountId="first" draftId={42} editorUrl={url} />);
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
test("both list actions exist and native return refreshes the list", async () => {
  const mock = server();
  render(<ListMyDrafts />);
  const row = (await screen.findByRole("heading", { name: "Original" })).closest("article")!;
  fireEvent.click(within(row).getByRole("button", { name: "Open Draft in Substack" }));
  expect(open).toHaveBeenCalledWith(url);
  fireEvent.click(within(row).getByRole("button", { name: "Edit Draft" }));
  await screen.findByLabelText("Title");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await waitFor(() =>
    expect(mock.mock.calls.filter(([url]) => String(url).includes("post_management"))).toHaveLength(2),
  );
});
test("prefills fields and saves title, subtitle and Markdown", async () => {
  server();
  form();
  await screen.findByLabelText("Title");
  expect((screen.getByLabelText("Markdown") as HTMLTextAreaElement).value).toBe("Original body");
  change("Title", "Updated");
  change("Subtitle", "New");
  change("Markdown", "New body");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(pop).toHaveBeenCalled());
  expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Draft changes saved" }));
});
test("rich bodies stay intact while editing metadata", async () => {
  const body = '{"type":"doc","content":[{"type":"paywall"}]}';
  const mock = server(body);
  form();
  await screen.findByLabelText("Title");
  expect(screen.queryByLabelText("Markdown")).toBeNull();
  change("Title", "Updated");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(pop).toHaveBeenCalled());
  expect(JSON.parse(String(mock.mock.calls.find(([, init]) => init?.method === "PUT")![1]?.body)).draft_body).toBe(
    body,
  );
});
test("blank title and unsupported Markdown cannot write", async () => {
  const mock = server();
  form();
  await screen.findByLabelText("Title");
  change("Title", " ");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await screen.findByText("Enter a title.");
  change("Title", "Updated");
  change("Markdown", "```js\ncode\n```");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(showToast).toHaveBeenCalled());
  expect(mock).toHaveBeenCalledTimes(1);
});
test("uncertain saves show browser recovery and reload", async () => {
  const mock = server(undefined, true);
  form();
  await screen.findByLabelText("Title");
  change("Title", "Updated");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await screen.findByText(/changes could not be verified/);
  expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open Draft in Substack" }));
  expect(open).toHaveBeenCalledWith(url);
  fireEvent.click(screen.getByRole("button", { name: "Reload Draft" }));
  await screen.findByLabelText("Title");
  expect(mock.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
});
test("stale publication links cannot fetch a draft", async () => {
  const mock = server();
  await saveAccount({ ...account, publication: "other" });
  form();
  await screen.findByText(/connection changed/);
  expect(mock).not.toHaveBeenCalled();
});
