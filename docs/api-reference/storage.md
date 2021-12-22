# Storage

The storage APIs can be used to store non-sensitive data that is persisted across command launches. Its methods are similar to the [browser's `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). All commands in an extension have shared access to the stored data. Extensions can't access the storage of other extensions. Values can be managed through functions such as [getLocalStorageItem](storage.md#getLocalStorageItem), [setLocalStorageItem](storage.md#setLocalStorageItem), or [removeLocalStorageItem](storage.md#removeLocalStorageItem). A typical use cases is storing user related data, for example entered todos.

{% hint style="info" %}
The data is stored in the user's database. The API is not meant to store large amounts of data. For this, use [Node's built-in APIs to write files](https://nodejs.dev/learn/writing-files-with-nodejs), e.g. to the extension's [support directory](environment.md#environment).
{% endhint %}

## API Reference

### allLocalStorageItems

Retrieve all stored values in the local storage of an extension.

#### Signature

```typescript
async function allLocalStorageItems(): Promise<Values>
```

#### Example

```typescript
import { allLocalStorageItems } from "@raycast/api";

interface Values {
  todo: string;
  priority: number;
}

export default async () => {
  const items: Values = await allLocalStorageItems();
  console.log(`Local storage item count: ${Object.entries(items).length}`);
};
```

#### Return

A promise that resolves with an object containing all [LocalStorageValues](#localstoragevalues).

### clearLocalStorage

Removes all stored values of an extension.

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
async function getLocalStorageItem(key: string): Promise<Value | undefined>
```

#### Example

```typescript
import { getLocalStorageItem } from "@raycast/api";

export default async () => {
  const item: string = await getLocalStorageItem("favorite-fruit");
  console.log(item);
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| key | <code>string</code> | Yes | The key you want to retrieve the value of. |

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
| key | <code>string</code> | Yes | The key you want to remove the value of. |

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
| key | <code>string</code> | Yes | The key you want to create or update the value of. |
| value | <code>[LocalStorageValue](#localstoragevalue)</code> | Yes | The value you want to create or update for the given key. |

#### Return

A promise that resolves when the value was stored.

### LocalStorageValues

Values of local storage items.

For type-safe values you can define your own interface. Use the keys of the local storage items as property name.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| [key: string] | <code>any</code> | Yes | The local storage value of a given key. |

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
