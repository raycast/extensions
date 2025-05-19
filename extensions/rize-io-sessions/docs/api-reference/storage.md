# Storage

## Overview

Similar to the LocalStorage browser API, this group of functions can be used to store non-sensitive small data that is persisted across command launches. All commands in an extension have shared access to the stored data. Values can be managed through functions such as [getLocalStorageItem](storage.md#getLocalStorageItem), [setLocalStorageItem](storage.md#setLocalStorageItem), or [removeLocalStorageItem](storage.md#removeLocalStorageItem). A typical use cases is storing user preferences. **Note** that this API is not meant to store large amounts of data and the data is **not encrypted**, i.e. could easily be inspected by anybody. We are going to provide more storage options for larger and sensitive data in the future.

You can also use Node's built-in APIs to write files, e.g. to the extension's own `supportPath`, accessible through [Environment](environment.md).

## API Reference

### allLocalStorageItems

Retrieve all stored values in the local storage of a command.

#### Signature

```typescript
async function allLocalStorageItems(): Promise<Record<string, LocalStorageValue>>
```

#### Example

```typescript
import { allLocalStorageItems } from "@raycast/api";

export default async () => {
  const items = await allLocalStorageItems();
  console.log(`Local storage item count: ${Object.entries(items).length}`);
};
```

#### Return

A promise that resolves with a record of all stored values.

### clearLocalStorage

Removes all stored values.

#### Signature

```typescript
async function clearLocalStorage(): Promise<void>
```

#### Example

```typescript
import { clearLocalStorage } from "@raycast/api";

export default async () => {
  await clearLocalStorage();
};
```

#### Return

A promise that resolves when all values were removed.

### getLocalStorageItem

Retrieve the stored value for the given key.

#### Signature

```typescript
async function getLocalStorageItem(key: string): Promise<LocalStorageValue | undefined>
```

#### Example

```typescript
import { getLocalStorageItem } from "@raycast/api";

export default async () => {
  const item = await getLocalStorageItem("favorite-fruit");
  console.log(item);
};
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

#### Example

```typescript
import { removeLocalStorageItem } from "@raycast/api";

export default async () => {
  await removeLocalStorageItem("favorite-fruit");
};
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

#### Example

```typescript
import { setLocalStorageItem } from "@raycast/api";

export default async () => {
  await setLocalStorageItem("favorite-fruit", "cherry");
};
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

#### Example

```typescript
import { setLocalStorageItem } from "@raycast/api";

export default async () => {
  // String
  await setLocalStorageItem("favorite-fruit", "cherry");

  // Number
  await setLocalStorageItem("fruit-basket-count", 3);

  // Boolean
  await setLocalStorageItem("fruit-eaten-today", true);
};
```
