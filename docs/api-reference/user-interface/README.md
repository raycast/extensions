# User Interface

Raycast uses React for its user interface declaration and renders the supported elements to our native UI. The API comes with a set of UI components that you can use to build your extensions. Think of it as a design system. The high-level components are the following:

- [List](list.md) to show multiple similar items, f.e. a list of your open todos.
- [Grid](grid.md) similar to a List but with more legroom to show an image for each item, f.e. a collection of icons.
- [Detail](detail.md) to present more information, f.e. the details of a GitHub pull request.
- [Form](form.md) to create new content, f.e. filing a bug report.

Each component can provide interaction via an [ActionPanel](action-panel.md). The panel has a list of [Actions](actions.md) where each one can be associated with a [keyboard shortcut](../keyboard.md). Shortcuts allow users to use Raycast without using their mouse.

## Rendering

To render a user interface, you need to do the following:

- Set the `mode` to `view` in the [`package.json` manifest file](../../information/manifest.md#command-properties)
- Export a React component from your command entry file

As a general rule of thumb, you should render something as quickly as possible. This guarantees that your command feels responsive. If you don't have data available to show, you can set the `isLoading` prop to `true` on top-level components such as [`<Detail>`](detail.md), [`<Form>`](form.md), or [`<List>`](list.md). It shows a loading indicator at the top of Raycast.

Here is an example that shows a loading indicator for 2 seconds after the command got launched:

```typescript
import { List } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  return <List isLoading={isLoading}>{/* Render your data */}</List>;
}
```
