# User Interface

Raycast uses React for its user interface declaration and renders the supported elements to native Raycast UI. State is managed through [React's built-in hooks and effects](https://reactjs.org/docs/hooks-intro.html). When state is updated, Raycast automatically re-renders the user interface.

The API comes with a set of UI components that are currently enable you to set up [List](list.md) and [Detail](https://github.com/raycast/extensions/tree/8faa62f0241793979ee33e59d2cb528131d9ab52/docs/api-reference/user-interface/detail.md)-style user interfaces and provide interaction via an [ActionPanel](action-panel.md). Each action can be associated with a [KeyboardShortcut](https://github.com/raycast/extensions/tree/8faa62f0241793979ee33e59d2cb528131d9ab52/docs/api-reference/keyboard.md) so that users can interact with the command without using the mouse.

You can gather user input through [Form](form.md) elements and show input fields such as [textfields](form.md#form.textfield) or [checkboxes](form.md#form.checkbox).

The UI API also includes imperative-style methods such as [showToast](toast.md#showToast), [closeMainWindow](window-and-search-bar.md#closeMainWindow), or [popToRoot](window-and-search-bar.md#popToRoot). They trigger temporary UI changes and are typically used from actions or to show error states.

