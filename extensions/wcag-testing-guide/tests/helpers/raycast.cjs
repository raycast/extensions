const assert = require("node:assert/strict");
const React = require("react");
const { act, create } = require("react-test-renderer");
const { createLoader } = require("../../scripts/load-typescript.cjs");
global.IS_REACT_ACT_ENVIRONMENT = true;

function harness() {
  const data = new Map(); const stack = []; const errors = [];
  const component = (name) => (props) => React.createElement(name, props, props.children, props.actions, props.detail);
  const Action = Object.assign(component("Action"), { Style: { Destructive: "destructive" } });
  for (const name of ["CopyToClipboard", "OpenInBrowser", "SubmitForm"]) Action[name] = component(`Action.${name}`);
  const ActionPanel = Object.assign(component("ActionPanel"), { Section: component("ActionPanel.Section"), Submenu: component("ActionPanel.Submenu") });
  const List = Object.assign(component("List"), { Section: component("List.Section"), Item: Object.assign(component("List.Item"), { Detail: component("List.Item.Detail") }), Dropdown: Object.assign(component("List.Dropdown"), { Item: component("List.Dropdown.Item") }) });
  const Form = component("Form");
  for (const name of ["Description", "TextArea", "TextField", "Checkbox"]) Form[name] = component(`Form.${name}`);
  Form.Dropdown = Object.assign(component("Form.Dropdown"), { Item: component("Form.Dropdown.Item") });
  const api = {
    Action, ActionPanel, List, Form, Detail: component("Detail"),
    Color: new Proxy({}, { get: (_, key) => key }), Icon: new Proxy({}, { get: (_, key) => key }),
    Alert: { ActionStyle: { Destructive: "destructive" } }, confirmAlert: async () => true,
    getPreferenceValues: () => ({ defaultVersion: "2.2", defaultLevel: "AA" }),
    LocalStorage: { getItem: async (key) => data.get(key), setItem: async (key, value) => { data.set(key, value); }, removeItem: async (key) => { data.delete(key); } },
    useNavigation: () => ({ push: (element) => stack.push(element), pop: () => stack.pop() }),
    showToast: async () => {}, Toast: { Style: { Success: "success", Failure: "failure" } }, open: async () => {}, openExtensionPreferences: async () => {},
  };
  const utils = {
    showFailureToast: async (error) => { errors.push(error); },
    usePromise: (fn) => {
      const [data, setData] = React.useState(); const [isLoading, setLoading] = React.useState(true);
      const ref = React.useRef(fn); ref.current = fn;
      const revalidate = React.useCallback(async () => { const value = await ref.current(); setData(value); setLoading(false); return value; }, []);
      React.useEffect(() => { void revalidate().catch((error) => errors.push(error)); }, [revalidate]);
      return { data, isLoading, revalidate };
    },
  };
  const load = createLoader({ "@raycast/api": api, "@raycast/utils": utils });
  const Command = load("src/wcag-explorer.tsx").default;
  const roots = [];
  const mount = async (node) => { let root; await act(async () => { root = create(node); }); roots.push(root); return root; };
  const action = (root, title) => root.root.findAll((node) => typeof node.type === "string" && node.props.title === title)[0];
  const invoke = async (root, title) => { const item = action(root, title); assert.ok(item, `Missing action ${title}`); await act(async () => { await item.props.onAction(); }); };
  const cleanup = async () => { await act(async () => { roots.forEach((root) => root.unmount()); }); };
  return { data, stack, errors, api, load, mount, action, invoke, cleanup, Command };
}

module.exports = { harness };
