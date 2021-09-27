# User Interface

Raycast uses React for its user interface declaration and renders the supported elements to native Raycast UI. State is managed through [React's built-in hooks and effects](https://reactjs.org/docs/hooks-intro.html). When state is updated, Raycast automatically re-renders the user interface. 

The API comes with a set of UI components that are currently enable you to set up [List](file:///Users/mann/Developer/api-alpha/documentation/modules.html#List) and [Detail](file:///Users/mann/Developer/api-alpha/documentation/modules.html#Detail)-style user interfaces and provide interaction via an [ActionPanel](file:///Users/mann/Developer/api-alpha/documentation/modules.html#ActionPanel). Each action can be associated with a [KeyboardShortcut](file:///Users/mann/Developer/api-alpha/documentation/interfaces/KeyboardShortcut.html) so that users can interact with the command without using the mouse.

You can gather user input through [Form](file:///Users/mann/Developer/api-alpha/documentation/modules.html#Form) elements and show input fields such as [textfields](file:///Users/mann/Developer/api-alpha/documentation/modules/Form.html#TextField) or [checkboxes](file:///Users/mann/Developer/api-alpha/documentation/modules/Form.html#Checkbox).

The UI API also includes imperative-style methods such as [showToast](file:///Users/mann/Developer/api-alpha/documentation/modules.html#showToast), [closeMainWindow](file:///Users/mann/Developer/api-alpha/documentation/modules.html#closeMainWindow), or [popToRoot](file:///Users/mann/Developer/api-alpha/documentation/modules.html#popToRoot). They trigger temporary UI changes and are typically used from actions or to show error states.

