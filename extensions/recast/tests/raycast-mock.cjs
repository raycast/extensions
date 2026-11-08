// Raycast provides this module inside its native renderer. Replace only that
// boundary so tests exercise the real @raycast/utils hooks with React.
const Module = require("node:module");
const React = require("react");
const manifest = require("../package.json");
const defaults = () =>
  Object.fromEntries(
    manifest.preferences.map((item) => [item.name, item.default ?? ""]),
  );
const state = {
  preferences: defaults(),
  selectedText: async () => "Sample selection",
  frontApp: async () => ({ name: "TextEdit" }),
  toasts: [],
};
const component = (name) => (props) =>
  React.createElement(
    name,
    props,
    ...React.Children.toArray([props.children, props.actions, props.metadata]),
  );
const Action = Object.assign(component("Action"), {
  SubmitForm: component("Action.SubmitForm"),
  Paste: component("Action.Paste"),
  CopyToClipboard: component("Action.CopyToClipboard"),
  OpenInBrowser: component("Action.OpenInBrowser"),
});
const ActionPanel = Object.assign(component("ActionPanel"), {
  Section: component("ActionPanel.Section"),
});
const Detail = Object.assign(component("Detail"), {
  Metadata: Object.assign(component("Detail.Metadata"), {
    Label: component("Detail.Metadata.Label"),
    Separator: component("Detail.Metadata.Separator"),
  }),
});
const Form = Object.assign(component("Form"), {
  TextField: component("Form.TextField"),
  TextArea: component("Form.TextArea"),
  Description: component("Form.Description"),
});
const api = {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon: new Proxy({}, { get: (_, name) => String(name) }),
  Keyboard: {
    Shortcut: {
      Common: {
        Refresh: { modifiers: ["cmd"], key: "r" },
        Copy: { modifiers: ["cmd", "shift"], key: "c" },
      },
    },
  },
  environment: {
    launchType: "userInitiated",
    entryPointMode: "view",
    supportPath: "/unused-test-cache",
    extensionName: "recast",
  },
  LaunchType: { Background: "background" },
  getPreferenceValues: () => ({ ...state.preferences }),
  getSelectedText: () => state.selectedText(),
  getFrontmostApplication: () => state.frontApp(),
  openExtensionPreferences: async () => {},
  showToast: async (...args) => {
    state.toasts.push(args);
    return { hide() {} };
  },
  Toast: { Style: { Failure: "failure" } },
};
const load = Module._load;
Module._load = function (name, ...args) {
  return name === "@raycast/api" ? api : load.call(this, name, ...args);
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
module.exports = {
  state,
  api,
  reset: () => {
    state.preferences = defaults();
    state.toasts = [];
  },
};
