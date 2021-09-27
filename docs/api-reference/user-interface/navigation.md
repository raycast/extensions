# Navigation

## API Reference

### useNavigation

A hook that lets you push and pop view components in the navigation stack.

#### Signature

```typescript
function useNavigation(): Navigation
```

#### Return

A [Navigation](navigation.md#navigation) object with Navigation.push and Navigation.pop functions. Use the functions to alter the navigation stack.

### Navigation

Return type of the [useNavigation](navigation.md#usenavigation) hook to perform push and pop actions.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| pop | `() => void` | Yes | Pop current view component from the navigation stack. |
| push | `(component: ReactNode) => void` | Yes | Push a new view component to the navigation stack. |

