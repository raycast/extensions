import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { mock, test } from "node:test";
import { compileFunction } from "node:vm";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const projectRoot = path.resolve(import.meta.dirname, "..");

// Load the actual handlers with Raycast UI and authenticated SDK boundaries mocked.
function loadSource(relativePath, mocks) {
  const filename = path.resolve(projectRoot, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("."))
      return loadSource(path.relative(projectRoot, path.resolve(path.dirname(filename), `${name}.ts`)), mocks);
    return nativeRequire(name);
  };
  compileFunction(outputText, ["require", "module", "exports"], { filename })(requireMock, module, module.exports);
  return module.exports;
}

function find(node, title) {
  if (!node) return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, title)).find(Boolean);
  if (typeof node.type === "function") return find(node.type(node.props), title);
  if (node.props?.title === title) return node.props;
  return find(node.props?.children, title) || find(node.props?.actions, title);
}

function fixture() {
  const email = {
    id: "email-1",
    to: ["test@example.com"],
    from: "sender@example.com",
    subject: "Test",
    created_at: "2026-08-31",
    last_event: "scheduled",
  };
  const contact = { id: "contact-1", email: "test@example.com" };
  const segment = { id: "segment-1", name: "Customers" };
  const sdk = {
    emails: {
      share: mock.fn(async () => ({ data: { url: "https://example.com/share" } })),
      cancel: mock.fn(async () => ({})),
      send: mock.fn(async () => ({ data: { id: "sent-1" } })),
    },
    contacts: {
      remove: mock.fn(async () => ({})),
      segments: { remove: mock.fn(async () => ({})) },
    },
  };
  const toast = {};
  const confirm = mock.fn(async () => true);
  const failure = mock.fn(async () => {});
  const copy = mock.fn(async () => {});
  const listRefresh = mock.fn(async () => {});
  const detailRefresh = mock.fn(async () => {
    email.last_event = "canceled";
  });
  const mutateContacts = mock.fn(async (request) => {
    await request;
  });
  const ui = (name) => new Proxy({ name }, { get: (_, property) => `${name}.${String(property)}` });
  const oauth = { withResend: (value) => value, getResend: () => sdk };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: { useState: () => [segment, () => {}] },
    "@raycast/api": {
      Action: { ...ui("Action"), Style: { Destructive: "destructive" } },
      ActionPanel: ui("ActionPanel"),
      Detail: { Metadata: ui("Metadata") },
      List: ui("List"),
      Icon: ui("Icon"),
      Color: ui("Color"),
      Keyboard: { Shortcut: { Common: { New: "new" } } },
      Alert: { ActionStyle: { Destructive: "destructive" } },
      Toast: { Style: { Animated: "animated", Success: "success" } },
      getPreferenceValues: () => ({ sender_name: "Sender", sender_email: "sender@example.com" }),
      confirmAlert: confirm,
      showToast: mock.fn(async (style, title) => Object.assign(toast, { style, title })),
      Clipboard: { copy },
    },
    "@raycast/utils": { showFailureToast: failure },
    "./lib/oauth": oauth,
    "../lib/oauth": oauth,
    "./components/ErrorComponent": {},
    "./lib/hooks": {
      useEmails: () => ({ emails: [email], mutate: listRefresh }),
      useGetEmail: () => ({ email, mutate: detailRefresh }),
      useSegments: () => ({ segments: [segment] }),
      useContacts: () => ({ contacts: [contact], mutate: mutateContacts }),
      onError: failure,
    },
  };
  const emails = loadSource("src/emails.tsx", mocks).default;
  const contacts = loadSource("src/contacts.tsx", mocks).default;
  const send = loadSource("src/tools/send-email.ts", mocks);
  const detail = () => {
    const target = find(emails(), "View Email").target;
    return target.type(target.props);
  };
  return {
    sdk,
    toast,
    confirm,
    failure,
    copy,
    listRefresh,
    detailRefresh,
    mutateContacts,
    email,
    emails,
    contacts,
    detail,
    send,
  };
}

for (const [title, method, failureTitle] of [
  ["Create 48-Hour Share Link", "share", "Could Not Create Share Link"],
  ["Cancel Scheduled Email", "cancel", "Could Not Cancel Email"],
]) {
  for (const mode of ["rejection", "SDK error"]) {
    test(`${title} reports ${mode} through a failure toast`, async () => {
      const f = fixture();
      f.sdk.emails[method].mock.mockImplementation(async () => {
        if (mode === "rejection") throw new Error("Network unavailable");
        return { error: { name: "api_error", message: "Network unavailable" } };
      });
      await find(f.emails(), title).onAction();
      assert.equal(f.failure.mock.calls.length, 1);
      assert.equal(f.failure.mock.calls[0].arguments[0].message, "Network unavailable");
      assert.equal(f.failure.mock.calls[0].arguments[1].title, failureTitle);
      assert.equal(f.copy.mock.calls.length, 0);
      assert.equal(f.listRefresh.mock.calls.length, 0);
    });
  }

  test(`${title} does nothing when confirmation is dismissed`, async () => {
    const f = fixture();
    f.confirm.mock.mockImplementation(async () => false);
    await find(f.emails(), title).onAction();
    assert.equal(f.sdk.emails[method].mock.calls.length, 0);
    assert.equal(f.toast.style, undefined);
  });
}

test("email details expose sharing and refresh both views after canceling", async () => {
  const f = fixture();
  await find(f.detail(), "Create 48-Hour Share Link").onAction();
  assert.deepEqual(f.sdk.emails.share.mock.calls[0].arguments, ["email-1", { expiresIn: "48 hours" }]);
  assert.deepEqual(f.copy.mock.calls[0].arguments, ["https://example.com/share"]);
  await find(f.detail(), "Cancel Scheduled Email").onAction();
  assert.deepEqual(f.sdk.emails.cancel.mock.calls[0].arguments, ["email-1"]);
  assert.equal(f.listRefresh.mock.calls.length, 1);
  assert.equal(f.detailRefresh.mock.calls.length, 1);
  assert.equal(f.toast.title, "Canceled Email");
  assert.equal(find(f.detail(), "Cancel Scheduled Email"), undefined);
  assert.equal(find(f.emails(), "Cancel Scheduled Email"), undefined);
});

test("clipboard failures are caught after creating a share link", async () => {
  const f = fixture();
  f.copy.mock.mockImplementation(async () => {
    throw new Error("Clipboard unavailable");
  });
  await find(f.detail(), "Create 48-Hour Share Link").onAction();
  assert.equal(f.failure.mock.calls[0].arguments[0].message, "Clipboard unavailable");
});

test("segment removal keeps cmd+D while account deletion has a separate confirmation and no shortcut", async () => {
  const f = fixture();
  const remove = find(f.contacts(), "Remove From Segment");
  const deletion = find(f.contacts(), "Delete Contact");
  assert.deepEqual(remove.shortcut, { modifiers: ["cmd"], key: "d" });
  assert.equal(deletion.shortcut, undefined);
  await remove.onAction();
  assert.deepEqual(f.sdk.contacts.segments.remove.mock.calls[0].arguments, [
    { segmentId: "segment-1", contactId: "contact-1" },
  ]);
  assert.equal(f.sdk.contacts.remove.mock.calls.length, 0);
  await deletion.onAction();
  assert.deepEqual(f.sdk.contacts.remove.mock.calls[0].arguments, [{ id: "contact-1" }]);
  const confirmation = f.confirm.mock.calls[1].arguments[0];
  assert.match(confirmation.title, /test@example.com/);
  assert.match(confirmation.message, /Resend account and all segments/);
  assert.match(confirmation.message, /cannot be undone/);
  const options = f.mutateContacts.mock.calls[1].arguments[1];
  assert.deepEqual(options.optimisticUpdate([{ id: "contact-1" }, { id: "contact-2" }]), [{ id: "contact-2" }]);
});

test("dismissing account deletion does not change contacts", async () => {
  const f = fixture();
  f.confirm.mock.mockImplementation(async () => false);
  await find(f.contacts(), "Delete Contact").onAction();
  assert.equal(f.sdk.contacts.remove.mock.calls.length, 0);
  assert.equal(f.mutateContacts.mock.calls.length, 0);
});

for (const mode of ["rejection", "SDK error"]) {
  test(`account deletion reports ${mode} without a success toast`, async () => {
    const f = fixture();
    f.sdk.contacts.remove.mock.mockImplementation(async () => {
      if (mode === "rejection") throw new Error("Delete failed");
      return { error: { name: "api_error", message: "Delete failed" } };
    });
    await find(f.contacts(), "Delete Contact").onAction();
    assert.equal(f.failure.mock.calls[0].arguments[0].message, "Delete failed");
    assert.notEqual(f.toast.style, "success");
  });
}

test("send confirmation shows exactly the parsed headers sent to Resend", async () => {
  const f = fixture();
  const input = {
    to: ["test@example.com"],
    subject: "Test",
    text: "Hello",
    headers: " Reply-To: old@example.com \n\n X-Callback: https://example.com:8443/hook\nReply-To: new@example.com",
  };
  const confirmation = await f.send.confirmation(input);
  const displayed = Object.fromEntries(
    confirmation.info
      .filter(({ name }) => name.startsWith("Header: "))
      .map(({ name, value }) => [name.slice(8), value]),
  );
  assert.deepEqual(displayed, { "Reply-To": "new@example.com", "X-Callback": "https://example.com:8443/hook" });
  await f.send.default(input);
  assert.deepEqual(f.sdk.emails.send.mock.calls[0].arguments[0].headers, displayed);
  const withoutHeaders = await f.send.confirmation({ ...input, headers: undefined });
  assert.equal(
    withoutHeaders.info.some(({ name }) => name.startsWith("Header: ")),
    false,
  );
  await assert.rejects(f.send.confirmation({ ...input, headers: "Missing separator" }), /Invalid header/);
});
