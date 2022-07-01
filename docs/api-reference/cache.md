# Cache

Caching abstraction that stores data on disk and supports LRU (least recently used) access. Since extensions can only consume up to a max. heap memory size, the cache only maintains a lightweight index in memory and stores the actual data in separate files on disk in the extension's support directory.

The Cache class provides CRUD-style methods (get, set, remove) to update and retrieve data synchronously based on a key. The data must be a string and it is up to the client to decide which serialization format to use.
A typical use case would be to use `JSON.stringify` and `JSON.parse`.

By default, the cache is shared between the commands of an extension. Use [Cache.Options](#cache.options) to configure a `namespace` per command if needed (for example, set it to `environment.commandName`).

```typescript
import { Cache } from "@raycast/api";

const cache = new Cache();
cache.set("items", JSON.stringify([{ id: "1", title: "Item 1" }]));
console.log(JSON.parse(cache.get("items")));
```

## API Reference

### Cache.Options

The options for creating a new Cache.

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| capacity | The capacity in bytes. If the stored data exceeds the capacity, the least recently used data is removed. The default capacity is 10 MB. | <code>number</code> |
| namespace | If set, the Cache will be namespaced via a subdirectory. This can be useful to separate the caches for individual commands of an extension. By default, the cache is shared between the commands of an extension. | <code>string</code> |

### Properties

| Property                                  | Description                                              | Type                 |
| :---------------------------------------- | :------------------------------------------------------- | :------------------- |
| isEmpty<mark style="color:red;">\*</mark> | Returns `true` if the cache is empty, `false` otherwise. | <code>boolean</code> |

### Methods

| Method                                                                                 |
| :------------------------------------------------------------------------------------- |
| <code>[get(key: string): string \| undefined](#get)</code>                             |
| <code>[has(key: string): boolean](#has)</code>                                         |
| <code>[set(key: string, data: string)](#set)</code>                                    |
| <code>[remove(key: string): boolean](#remove)</code>                                   |
| <code>[clear(options = { notifySubscribers: true })](#clear)</code>                    |
| <code>[subscribe(subscriber: Cache.Subscriber): Cache.Subscription](#subscribe)</code> |

### get

Returns the data for the given key. If there is no data for the key, `undefined` is returned.
If you want to just check for the existence of a key, use [has](#has).

#### Signature

```typescript
get(key: string): string | undefined
```

#### Parameters

| Name                                  | Description                 | Type                |
| :------------------------------------ | :-------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark> | The key of the Cache entry. | <code>string</code> |

### has

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

### set

Sets the data for the given key.
If the data exceeds the configured `capacity`, the least recently used entries are removed.
This also notifies registered subscribers (see [subscribe](#subscribe)).

#### Signature

```typescript
set(key: string, data: string)
```

#### Parameters

| Name                                   | Description                              | Type                |
| :------------------------------------- | :--------------------------------------- | :------------------ |
| key<mark style="color:red;">\*</mark>  | The key of the Cache entry.              | <code>string</code> |
| data<mark style="color:red;">\*</mark> | The stringified data of the Cache entry. | <code>string</code> |

### remove

Removes the data for the given key.
This also notifies registered subscribers (see [subscribe](#subscribe)).
Returns `true` if data for the key was removed, `false` otherwise.

#### Signature

```typescript
remove(key: string): boolean
```

### clear

Clears all stored data.
This also notifies registered subscribers (see [subscribe](#subscribe)) unless the `notifySubscribers` option is set to `false`.

#### Signature

```typescript
clear((options = { notifySubscribers: true }));
```

#### Parameters

| Name    | Description                                                                                                                | Type                |
| :------ | :------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| options | Options with a `notifySubscribers` property. The default is `true`; set to `false` to disable notification of subscribers. | <code>object</code> |

### subscribe

Registers a new subscriber that gets notified when cache data is set or removed.
Returns a function that can be called to remove the subscriber.

#### Signature

```typescript
subscribe(subscriber: Cache.Subscriber): Cache.Subscription
```

#### Parameters

| Name       | Description                                                                                                                                                                                               | Type                          |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| subscriber | A function that is called when the Cache is updated. The function receives two values: the `key` of the Cache entry that was updated or `undefined` when the Cache is cleared, and the associated `data`. | <code>Cache.Subscriber</code> |

## Types

### Cache.Subscriber

Function type used as parameter for [subscribe](#subscribe).

```typescript
type Subscriber = (key: string | undefined, data: string | undefined) => void;
```

### Cache.Subscription

Function type returned from [subscribe](#subscribe).

```typescript
type Subscription = () => void;
```
