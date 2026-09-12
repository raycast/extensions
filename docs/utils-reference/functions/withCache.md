# `withCache`

Higher-order function which wraps a function with caching functionality using Raycast's Cache API.
Allows for caching of expensive functions like paginated API calls that rarely change.

## Signature

```tsx
function withCache<Fn extends (...args: any) => Promise<any>>(
  fn: Fn,
  options?: {
    validate?: (data: Awaited<ReturnType<Fn>>) => boolean;
    maxAge?: number;
  },
): Fn & { clearCache: () => void };
```

### Arguments

`options` is an object containing:

- `options.validate`: an optional function that receives the cached data and returns a boolean depending on whether the data is still valid or not.
- `options.maxAge`: Maximum age of cached data in milliseconds after which the data will be considered invalid

### Return

Returns the wrapped function

## Example

```tsx
import { withCache } from "@raycast/utils";

function fetchExpensiveData(query) {
  // ...
}

const cachedFunction = withCache(fetchExpensiveData, {
  maxAge: 5 * 60 * 1000, // Cache for 5 minutes
});

const result = await cachedFunction(query);
```
