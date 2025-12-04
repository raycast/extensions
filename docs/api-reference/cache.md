# Caching

Caching abstraction that stores data on disk and supports LRU (least recently used) access. Since extensions can only consume up to a max. heap memory size, the cache only maintains a lightweight index in memory and stores the actual data in separate files on disk in the extension's support directory.

## API Reference

### Cache

The `Cache` class provides CRUD-style methods (get, set, remove) to update and retrieve data synchronously based on a key. The data must be a string and it is up to the client to decide which serialization format to use.
A typical use case would be to use `JSON.stringify` and `JSON.parse`.

By default, the cache is shared between the commands of an extension. Use [Cache.Options](#cache.options) to configure a `namespace` per command if needed (for example, set it to [`environment.commandName`](./environment.md)).

#### Signature

```typescript
constructor(options: Cache.Options): Cache
```

#### Example

```typescript
import { List, Cache } from "@raycast/api";

type Item = { id: string; title: string };
const cache = new Cache();
cache.set("items", JSON.stringify([{ id: "1", title: "Item 1" }]));

export default function Command() {
  const cached = cache.get("items");
  const items: Item[] = cached ? JSON.parse(cached) : [];

  return (
    <List>
      {items.map((item) => (
        <List.Item key={item.id} title={item.title} />
      ))}
    </List>
  );
}
```

#### Properties

| Property                                  | Description                                              | Type                 |
| :---------------------------------------- | :------------------------------------------------------- | :------------------- |
| isEmpty<mark style="color:red;">\*</mark> | Returns `true` if the cache is empty, `false` otherwise. | <code>boolean</code> |

#### Methods

| Method                                                                                       |
| :------------------------------------------------------------------------------------------- |
| <code>[get(key: string): string \| undefined](#cache-get)</code>                             |
| <code>[has(key: string): boolean](#cache-has)</code>                                         |
| <code>[set(key: string, data: string): void](#cache-set)</code>                              |
| <code>[remove(key: string): boolean](#cache-remove)</code>                                   |
| <code>[clear(options = { notifySubscribers: true }): void](#cache-clear)</code>              |
| <code>[subscribe(subscriber: Cache.Subscriber): Cache.Subscription](#cache-subscribe)</code> |

### Cache#get

Returns the data for the given key. If there is no data for the key, `undefined` is returned.
If you want to just check for the existence of a key, use [has](#cache-has).

#### Signature

```typescript
get(key: string): string | undefined
```

#### Parameters

| Name                                  | Description                 | Type                |
| :------------------------------------ | :-------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark> | The key of the Cache entry. | <code>string</code> |

### Cache#has

Returns `true` if data for the key exists, `false` otherwise.
You can use this method to check for entries without affecting the LRU access.

#### Signature

```typescript
has(key: string): boolean
```

#### Parameters

| Name                                  | Description                 | Type                |
| :------------------------------------ | :-------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark> | The key of the Cache entry. | <code>string</code> |

### Cache#set

Sets the data for the given key.
If the data exceeds the configured `capacity`, the least recently used entries are removed.
This also notifies registered subscribers (see [subscribe](#cache-subscribe)).

#### Signature

```typescript
set(key: string, data: string)
```

#### Parameters

| Name                                   | Description                              | Type                |
| :------------------------------------- | :--------------------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark>  | The key of the Cache entry.              | <code>string</code> |
| data<mark style="color:red;">\*</mark> | The stringified data of the Cache entry. | <code>string</code> |

### Cache#remove

Removes the data for the given key.
This also notifies registered subscribers (see [subscribe](#cache-subscribe)).
Returns `true` if data for the key was removed, `false` otherwise.

#### Signature

```typescript
remove(key: string): boolean
```

### Cache#clear

Clears all stored data.
This also notifies registered subscribers (see [subscribe](#cache-subscribe)) unless the `notifySubscribers` option is set to `false`.

#### Signature

```typescript
clear((options = { notifySubscribers: true }));
```

#### Parameters

| Name    | Description                                                                                                                | Type                |
| :------ | :------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| options | Options with a `notifySubscribers` property. The default is `true`; set to `false` to disable notification of subscribers. | <code>object</code> |

### Cache#subscribe

Registers a new subscriber that gets notified when cache data is set or removed.
Returns a function that can be called to remove the subscriber.

#### Signature

```typescript
subscribe(subscriber: Cache.Subscriber): Cache.Subscription
```

#### Parameters

| Name       | Description                                                                                                                                                                                               | Type                                               |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| subscriber | A function that is called when the Cache is updated. The function receives two values: the `key` of the Cache entry that was updated or `undefined` when the Cache is cleared, and the associated `data`. | <code>[Cache.Subscriber](#cache.subscriber)</code> |

## Types

### Cache.Options

The options for creating a new Cache.

#### Properties

<InterfaceTableFromJSDoc name="Cache.Options" />

### Cache.Subscriber

Function type used as parameter for [subscribe](#cache-subscribe).

```typescript
type Subscriber = (key: string | undefined, data: string | undefined) => void;
```

### Cache.Subscription

Function type returned from [subscribe](#cache-subscribe).

```typescript
type Subscription = () => void;
```
