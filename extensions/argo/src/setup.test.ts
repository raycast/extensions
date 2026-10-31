import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { remotePrompt, safeMarkdown } from "./core.js";
import { setupAddress, setupModes, tunnelCommand } from "./setup.js";
test("topology guidance picks forwarding direction from bridge placement and SSH initiator", () => {
  const agent = "http://127.0.0.1:49123",
    bridge = "http://127.0.0.1:48123",
    mac = "http://127.0.0.1:50123";
  assert.equal(tunnelCommand("local", "", agent, bridge, mac), undefined);
  assert.equal(tunnelCommand("existing", "", agent, bridge, mac), undefined);
  assert.match(
    tunnelCommand("mac-reverse", "user@server", agent, bridge, mac)!,
    /-R 127\.0\.0\.1:49123:127\.0\.0\.1:48123 -- user@server$/,
  );
  assert.match(
    tunnelCommand("remote-local", "my-mac", agent, bridge, mac)!,
    /-L 127\.0\.0\.1:49123:127\.0\.0\.1:48123 -- my-mac$/,
  );
  assert.match(
    tunnelCommand("server-forward", "server", agent, bridge, mac)!,
    /-L 127\.0\.0\.1:50123:127\.0\.0\.1:48123 -- server$/,
  );
  for (const target of ["-oProxyCommand=evil", "server;echo x", "server\nother", "$(anything)"])
    assert.throws(() => tunnelCommand("mac-reverse", target, agent, bridge, mac));
  assert.throws(() => tunnelCommand("server-forward", "server", agent, "http://public.example", mac));
  assert.equal(setupAddress("local", mac), mac);
  const prompt = remotePrompt("local", bridge, "ARGO-" + "a".repeat(32));
  assert.match(prompt, /neither a remote machine nor SSH -R is required/);
});
test("pairing captures submitted address, hides code in preview and prevents double creation", async () => {
  const source = ts.createSourceFile(
    "onboarding.tsx",
    readFileSync(new URL("./onboarding.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = source.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === "PairAgent",
  );
  assert.ok(declaration);
  const states: unknown[] = [],
    refs: Array<{
      current: any;
    }> = [];
  let cursor = 0,
    refCursor = 0;
  type View = {
    type: unknown;
    props: Record<string, any>;
  };
  let complete!: (value: object) => void,
    calls = 0;
  const feed = {
    hub: {
      current: {
        createPairing(name: string, adapter: string) {
          calls++;
          assert.equal(name, "remote-backend");
          assert.equal(adapter, "codex");
          return new Promise((resolve) => {
            complete = resolve;
          });
        },
      },
    },
    connection: "live",
    connectionKey: "bridge-a",
    profileName: "Default",
    address: "http://127.0.0.1:48123",
    loading: false,
  };
  const component = runInNewContext(
    ts.transpileModule(declaration.getText(source), {
      compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: "element", target: ts.ScriptTarget.ES2023 },
    }).outputText + "\nPairAgent;",
    {
      element: (type: unknown, props: object, ...children: unknown[]) => ({ type, props: { ...props, children } }),
      useState(initial: any) {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [
          states[index],
          (value: unknown) => {
            states[index] = value;
          },
        ];
      },
      useRef(initial: unknown) {
        const index = refCursor++;
        return refs[index] ?? (refs[index] = { current: initial });
      },
      useEffect() {},
      popToRoot() {},
      useHub: () => feed,
      useNavigation: () => ({ pop() {} }),
      remotePrompt,
      safeMarkdown,
      setupAddress,
      setupModes,
      tunnelCommand,
      Form: {
        Description: "Description",
        TextField: "TextField",
        Dropdown: Object.assign("Dropdown", { Item: "Item" }),
        Separator: "Separator",
      },
      Detail: "Detail",
      ActionPanel: "ActionPanel",
      Action: {
        SubmitForm: "SubmitForm",
        CopyToClipboard: "CopyToClipboard",
        Push: "Push",
        OpenInBrowser: "OpenInBrowser",
      },
      Icon: {},
      Setup: "Setup",
      ConnectionGuide: "ConnectionGuide",
      GUIDE: "guide",
      errorText: () => "Error",
      showToast() {},
      Toast: { Style: {} },
    },
  );
  const render = (): View => {
    cursor = 0;
    refCursor = 0;
    return component({ mode: "existing", onConnected() {} });
  };
  render()
    .props.children.find((view: View | null) => view?.props.id === "agent")
    .props.onChange("codex");
  const submit = render().props.actions.props.children[0].props.onSubmit;
  const pending = submit();
  await submit();
  assert.equal(calls, 1);
  const loading = render();
  assert.equal(loading.props.isLoading, true);
  loading.props.children
    .find((view: View | null) => view?.props.id === "agentUrl")
    .props.onChange("https://invalid.example");
  loading.props.children.find((view: View | null) => view?.props.id === "name").props.onChange("edited-name");
  const code = "ARGO-" + "a".repeat(32);
  complete({ code, expiresAt: Date.now() + 600000 });
  await pending;
  const detail = render();
  assert.ok(!detail.props.markdown.includes(code));
  const copy = detail.props.actions.props.children[0];
  assert.equal(copy.props.content, remotePrompt("remote-backend", "http://127.0.0.1:49123", code, "codex"));
  assert.equal(copy.props.concealed, true);
  feed.connectionKey = "bridge-b";
  assert.equal(render().props.actions.props.children[0], null, "old bridge prompt is not copied after switching");
});
