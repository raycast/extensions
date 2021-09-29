# Rendering

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
