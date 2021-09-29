# User Interface

Raycast uses React for its user interface declaration and renders the supported elements to native Raycast UI. State is managed through [React's built-in hooks and effects](https://reactjs.org/docs/hooks-intro.html). When state is updated, Raycast automatically re-renders the user interface. 

The API comes with a set of UI components that are currently enable you to set up [List](../user-interface/list.md) and [Detail](../user-interface/detail.md)-style user interfaces and provide interaction via an [ActionPanel](../user-interface/action-panel.md). Each action can be associated with a [KeyboardShortcut](../keyboard.md) so that users can interact with the command without using the mouse.

You can gather user input through [Form](../user-interface/form.md) elements and show input fields such as [textfields](../user-interface/form.md#form.textfield) or [checkboxes](../user-interface/form.md#form.checkbox).

The UI API also includes imperative-style methods such as [showToast](../user-interface/toast.md#showToast), [closeMainWindow](../user-interface/window-and-search-bar.md#closeMainWindow), or [popToRoot](../user-interface/window-and-search-bar.md#popToRoot). They trigger temporary UI changes and are typically used from actions or to show error states.

