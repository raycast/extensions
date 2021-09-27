# Navigation

## API Reference

### useNavigation

A hook that lets you push and pop view components in the navigation stack.

#### Signature

```typescript
function useNavigation(): Navigation
```

#### Return

A [Navigation](../user-interface/navigation.md#navigation) object with Navigation.push and Navigation.pop functions.
Use the functions to alter the navigation stack.

### Navigation

Return type of the [useNavigation](../user-interface/navigation.md#usenavigation) hook to perform push and pop actions.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| pop | <code>() => void</code> | Yes | Pop current view component from the navigation stack. |
| push | <code>(component: ReactNode) => void</code> | Yes | Push a new view component to the navigation stack. |
