# Storage

## Overview

Similar to the LocalStorage browser API, this group of functions can be used to store non-sensitive small data that is persisted across command launches. All commands in an extension have shared access to the stored data. Values can be managed through functions such as [getLocalStorageItem](file:///Users/mann/Developer/api-alpha/documentation/modules.html#getLocalStorageItem), [setLocalStorageItem](file:///Users/mann/Developer/api-alpha/documentation/modules.html#setLocalStorageItem), or [removeLocalStorageItem](file:///Users/mann/Developer/api-alpha/documentation/modules.html#removeLocalStorageItem). A typical use cases is storing user preferences. **Note** that this API is not meant to store large amounts of data and the data is **not encrypted**, i.e. could easily be inspected by anybody. We are going to provide more storage options for larger and sensitive data in the future.

You can also use Node's built-in APIs to write files, e.g. to the extension's own `supportPath`, accessible through [Environment](file:///Users/mann/Developer/api-alpha/documentation/interfaces/Environment.html).

## API Reference

### allLocalStorageItems

Retrieve all stored values in the local storage of a command.

#### Signature

```typescript
async function allLocalStorageItems(): Promise<Record<string, LocalStorageValue>>
```

#### Return

A promise that resolves with a record of all stored values.

### clearLocalStorage

Removes all stored values.

#### Signature

```typescript
async function clearLocalStorage(): Promise<void>
```

#### Return

A promise that resolves when all values were removed.

### getLocalStorageItem

Retrieve the stored value for the given key.

#### Signature

```typescript
async function getLocalStorageItem(key: string): Promise<LocalStorageValue | undefined>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| key | `string` | Yes | The key you want to retrieve the value of. |

#### Return

A promise that resolves with the the stored value for the given key. If the key does not exist, `undefined` is returned.

### removeLocalStorageItem

Removes the stored value for the given key.

#### Signature

```typescript
async function removeLocalStorageItem(key: string): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| key | `string` | Yes | The key you want to remove the value of. |

#### Return

A promise that resolves when the value was removed.

### setLocalStorageItem

Stores a value for the given key.

#### Signature

```typescript
async function setLocalStorageItem(key: string, value: LocalStorageValue): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| key | `string` | Yes | The key you want to create or update the value of. |
| value | `LocalStorageValue` | Yes | The value you want to create or update for the given key. |

#### Return

A promise that resolves when the value was stored.

### LocalStorageValue

```typescript
LocalStorageValue: string | number | boolean
```

Supported storage value types.
