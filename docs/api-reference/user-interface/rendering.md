# Rendering

To render a user interface, you need to do the following:

* Set the `mode` to `view` in the [`package.json` manifest file](../../information/manifest.md#command-properties)
* Export a React component from your command entry file

As a general rule of thumb, you should render something as quickly as possible. This guarantees that your command feels responsive. If you don't have data available to show, you can set the `isLoading` prop to `true` on top-level components such as `<Detail>`, [`<Form>`](form.md#form) or [`<List>`](list.md#list). This shows a loading indicator at the top of Raycast. 

Here is an example which shows a loading indicator for 2 seconds after the command got launched:

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

Alternatively to exporting a React component, you can call the [`render`](rendering.md#render) function. Internally we call this function for you with your exported component. In most cases, you should not use the function directly. However, it can be handy if you need to prepare some data before rendering. 

## API Reference

### render

Takes a React Components and renders it in Raycast for command types that show a `view`.

#### Signature

```typescript
function render(nodeToRender: ReactNode): void
```

#### Example

```typescript
import { Detail } from "@raycast/api"
const Command = () => <Detail markdown="Hello World" />
render(<Command />)
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| nodeToRender | `ReactNode` | Yes |  |
