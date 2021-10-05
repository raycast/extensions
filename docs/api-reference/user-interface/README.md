# User Interface

Raycast uses React for its user interface declaration and renders the supported elements to native our native UI. The API comes with a set of UI components that you can use to build your extensions. Think of it as a design system. The high-level components are the following:

* [List](list.md) to show multiple similar items, f.e. a list of your open todos.
* [Detail](detail.md) to present more information, f.e. the details of a GitHub pull request.
* [Form](form.md) to create new content, f.e. filing a bug report.

Each component can provide interaction via an [ActionPanel](action-panel.md). The panel has a list of actions where each one can be associated with a keyboard shortcut. Shortcuts allow users to use Raycast without using their mouse.

In addition to the React components, there imperative mthods such as [`showToast`](toast.md#showtoast), [`closeMainWindow`](window-and-search-bar.md#closemainwindow) or [`popToRoot`](window-and-search-bar.md#poptoroot) that be used to trigger temporary UI changes. 

