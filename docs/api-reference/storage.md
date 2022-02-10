# Storage

The storage APIs can be used to store non-sensitive data that is persisted across command launches. All commands in an extension have shared access to the stored data. Extensions can't access the storage of other extensions. Values can be managed through functions such as [getLocalStorageItem](storage.md#getLocalStorageItem), [setLocalStorageItem](storage.md#setLocalStorageItem), or [removeLocalStorageItem](storage.md#removeLocalStorageItem). A typical use cases is storing user related data, for example entered todos.

{% hint style="info" %}
The data is stored in the user's database. The API is not meant to store large amounts of data. For this, use [Node's built-in APIs to write files](https://nodejs.dev/learn/writing-files-with-nodejs), e.g. to the extension's [support directory](environment.md#environment).
{% endhint %}

## API Reference

### allItems

Retrieve all stored values in the local storage of an extension.

#### Signature

```typescript
async function allItems(): Promise<Values>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

interface Values {
  todo: string;
  priority: number;
}

export default async () => {
  const items = await LocalStorage.allItems<Values>();
  console.log(`Local storage item count: ${Object.entries(items).length}`);
};
```

#### Return

A Promise that resolves with an object containing all [Values](#values).

### clear

Removes all stored values of an extension.

#### Signature

```typescript
async function clear(): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async () => {
  await LocalStorage.clear();
};
```

#### Return

A Promise that resolves when all values are removed.

### getItem

Retrieve the stored value for the given key.

#### Signature

```typescript
async function getItem(key: string): Promise<Value | undefined>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async () => {
  const item = await LocalStorage.getItem<string>("favorite-fruit");
  console.log(item);
};
```

#### Parameters

| Name | Type                | Required | Description                                |
| :--- | :------------------ | :------- | :----------------------------------------- |
| key  | <code>string</code> | Yes      | The key you want to retrieve the value of. |

#### Return

A Promise that resolves with the stored value for the given key. If the key does not exist, `undefined` is returned.

### removeItem

Removes the stored value for the given key.

#### Signature

```typescript
async function removeItem(key: string): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async () => {
  await LocalStorage.removeItem("favorite-fruit");
};
```

#### Parameters

| Name | Type                | Required | Description                              |
| :--- | :------------------ | :------- | :--------------------------------------- |
| key  | <code>string</code> | Yes      | The key you want to remove the value of. |

#### Return

A Promise that resolves when the value is removed.

### setItem

Stores a value for the given key.

#### Signature

```typescript
async function setItem(key: string, value: Value): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async () => {
  await LocalStorage.setItem("favorite-fruit", "cherry");
};
```

#### Parameters

| Name  | Type                         | Required | Description                                               |
| :---- | :--------------------------- | :------- | :-------------------------------------------------------- |
| key   | <code>string</code>          | Yes      | The key you want to create or update the value of.        |
| value | <code>[Value](#value)</code> | Yes      | The value you want to create or update for the given key. |

#### Return

A Promise that resolves when the value is stored.

## Types

### Values

Values of local storage items.

For type-safe values, you can define your own interface. Use the keys of the local storage items as the property names.

#### Properties

| Name          | Type             | Description                             |
| :------------ | :--------------- | :-------------------------------------- |
| [key: string] | <code>any</code> | The local storage value of a given key. |

### Value

```typescript
Value: string | number | boolean;
```

Supported storage value types.

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async () => {
  // String
  await LocalStorage.setItem("favorite-fruit", "cherry");

  // Number
  await LocalStorage.setItem("fruit-basket-count", 3);

  // Boolean
  await LocalStorage.setItem("fruit-eaten-today", true);
};
```
