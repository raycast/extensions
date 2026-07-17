# Storage

The storage APIs can be used to store data in Raycast's [local encrypted database](../information/security.md#data-storage).

All commands in an extension have shared access to the stored data. Extensions can _not_ access the storage of other extensions.

Values can be managed through functions such as [`LocalStorage.getItem`](storage.md#localstorage.getitem), [`LocalStorage.setItem`](storage.md#localstorage.setitem), or [`LocalStorage.removeItem`](storage.md#localstorage.removeitem). A typical use case is storing user-related data, for example entered todos.

{% hint style="info" %}
The API is not meant to store large amounts of data. For this, use [Node's built-in APIs to write files](https://nodejs.org/en/learn/manipulating-files/writing-files-with-nodejs), e.g. to the extension's [support directory](environment.md#environment).
{% endhint %}

## API Reference

### LocalStorage.getItem

Retrieve the stored value for the given key.

#### Signature

```typescript
async function getItem(key: string): Promise<Value | undefined>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  const item = await LocalStorage.getItem<string>("favorite-fruit");
  console.log(item);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="LocalStorage.getItem" />

#### Return

A Promise that resolves with the stored value for the given key. If the key does not exist, `undefined` is returned.

### LocalStorage.setItem

Stores a value for the given key.

#### Signature

```typescript
async function setItem(key: string, value: Value): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  const item = await LocalStorage.getItem<string>("favorite-fruit");
  console.log(item);
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="LocalStorage.setItem" />

#### Return

A Promise that resolves when the value is stored.

### LocalStorage.removeItem

Removes the stored value for the given key.

#### Signature

```typescript
async function removeItem(key: string): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.setItem("favorite-fruit", "apple");
  console.log(await LocalStorage.getItem<string>("favorite-fruit"));
  await LocalStorage.removeItem("favorite-fruit");
  console.log(await LocalStorage.getItem<string>("favorite-fruit"));
}
```

#### Parameters

<FunctionParametersTableFromJSDoc name="LocalStorage.removeItem" />

#### Return

A Promise that resolves when the value is removed.

### LocalStorage.allItems

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

export default async function Command() {
  const items = await LocalStorage.allItems<Values>();
  console.log(`Local storage item count: ${Object.entries(items).length}`);
}
```

#### Return

A Promise that resolves with an object containing all [Values](#localstorage.values).

### LocalStorage.clear

Removes all stored values of an extension.

#### Signature

```typescript
async function clear(): Promise<void>;
```

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  await LocalStorage.clear();
}
```

#### Return

A Promise that resolves when all values are removed.

## Types

### LocalStorage.Values

Values of local storage items.

For type-safe values, you can define your own interface. Use the keys of the local storage items as the property names.

#### Properties

| Name          | Type             | Description                             |
| :------------ | :--------------- | :-------------------------------------- |
| [key: string] | <code>any</code> | The local storage value of a given key. |

### LocalStorage.Value

```typescript
Value: string | number | boolean;
```

Supported storage value types.

#### Example

```typescript
import { LocalStorage } from "@raycast/api";

export default async function Command() {
  // String
  await LocalStorage.setItem("favorite-fruit", "cherry");

  // Number
  await LocalStorage.setItem("fruit-basket-count", 3);

  // Boolean
  await LocalStorage.setItem("fruit-eaten-today", true);
}
```
