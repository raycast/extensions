import React from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createComponent(name: string) {
    const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
        React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
}

const Action = Object.assign(createComponent("Action"), {
    Push: createComponent("Action.Push"),
    SubmitForm: createComponent("Action.SubmitForm"),
    OpenInBrowser: createComponent("Action.OpenInBrowser"),
    CopyToClipboard: createComponent("Action.CopyToClipboard"),
});

const ActionPanel = Object.assign(createComponent("ActionPanel"), {
    Section: createComponent("ActionPanel.Section"),
});

const Icon = new Proxy(
    {},
    {
        get: (_target, property) => String(property),
    },
);

// List.Item renders its `actions` prop so action titles are reachable in findAll
const ListItem = ({
    children,
    actions,
    ...props
}: {
    children?: React.ReactNode;
    actions?: React.ReactNode;
}) => React.createElement("List.Item", props, actions, children);
ListItem.displayName = "List.Item";

const Dropdown = Object.assign(createComponent("Form.Dropdown"), {
    Item: createComponent("Form.Dropdown.Item"),
});

const Form = Object.assign(createComponent("Form"), {
    Description: createComponent("Form.Description"),
    Dropdown,
    PasswordField: createComponent("Form.PasswordField"),
    TextArea: createComponent("Form.TextArea"),
    TextField: createComponent("Form.TextField"),
});

const List = Object.assign(createComponent("List"), {
    EmptyView: createComponent("List.EmptyView"),
    Item: ListItem,
    Section: createComponent("List.Section"),
});

jest.mock("node-fetch", () => jest.fn(), { virtual: true });

jest.mock("@raycast/api", () => ({
    Action,
    ActionPanel,
    Alert: { ActionStyle: { Default: "default", Destructive: "destructive" } },
    Color: {},
    Detail: createComponent("Detail"),
    Form,
    Icon,
    List,
    LocalStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    },
    Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
    confirmAlert: jest.fn(),
    environment: { isDevelopment: false },
    getPreferenceValues: jest.fn(() => ({ AppId: "", Secret: "", Login: "", Password: "" })),
    popToRoot: jest.fn(),
    push: jest.fn(),
    showToast: jest.fn(),
}), { virtual: true });
