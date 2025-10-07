# Raycast Utilities

In addition to the [Raycast API](../api-reference/cache.md) which is bundled as part of the app, we also provide a sibling package that contains a set of utilities to streamline common patterns and operations used in extensions.

![](.gitbook/assets/utils-illustration.jpg)

## Installation

This package can be installed independently using `npm`.

```
npm install --save @raycast/utils
```

`@raycast/utils` has a [peer dependency](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#peerdependencies) on `@raycast/api`. This means that a certain version of `utils` will require a version above a certain version of `api`. `npm` will warn you if that is not the case.

## Changelog

### v2.2.1

- Fix compiled file to actually make `useSQL` and `executeSQL` work on Windows.

### v2.2.0

- Make `useSQL` and `executeSQL` work on Windows.

### v2.1.1

- Fix the default size of `getFavicon`.

### v2.1.0

- `getFavicon` will now respect the user's setting for the favicon provider. Note that the `Apple` provider isn't supported since it relies on a native API.

### v2.0.1

- Fix types for ESM extensions

### v2.0.0

- The library can now be tree-shaken, reducing its size considerably.
- When using `usePromise` and mutating the data with an optimistic update before it is fetched, the current fetch will be aborted to avoid a race condition.
- Add a new [`runPowerShellScript`](./functions/runPowerShellScript.md) function.

### v1.19.1

- Fixed an issue where arguments weren't passed to `withCache`.

### v1.19.0

- Add a new [`withCache`](./functions/withCache.md) function.

### v1.18.1

- Fixed an issue where setting `timeout` to `0` in `runAppleScript` would not work.

### v1.18.0

- Add a new [`executeSQL](./functions/executeSQL.md) function.

### v1.17.0

- Add a new [`createDeeplink`](./functions/createDeeplink.md) function.

### v1.16.5

- Fixed the bug where `failureToastOptions` did not apply for `useExec` and `useStreamJSON` hooks.

### v1.16.4

- Avoid throwing an error when `useFetch` can't parse the `Content-Type` header of the response.

### v1.16.3

- Fix an issue where `URLSearchParams` couldn't be passed as an option to `useFetch` or `useCachedPromise`, causing extensions to crash.

### v1.16.2

- Fixed the refresh token flow to log out the user instead of throwing an error.

### v1.16.1

- Fixed an issue where `bodyEncoding` wasn't properly used in OAuthService.

### v1.16.0

- Add a `failureToastOptions` prop to `useFetch`, `useCachedPromise`, and `usePromise` to make it possible to customize the error displayed instead of a generic "Failed to fetch latest data".

### v1.15.0

- Add [`useLocalStorage`](./react-hooks/useLocalStorage.md) hook.

### v1.14.0

- Add [`useStreamJSON`](./react-hooks/useStreamJSON.md) hook.

### v1.13.6

- Updated `useFetch`'s `mapResult` type to allow returning `cursor` in addition to `data` and `hasMore`.

### v1.13.5

- Extended `PaginationOptions` with `cursor`.

### v1.13.4

- Fixed non-paginated version of `useFetch` not being re-run when `url` changes.

### v1.13.3

- Fixed `optimisticUpdate` not working when paginating beyond the first page when using `useCachedPromise` or other hooks that build on top of it..
- Fixed `useFetch` type requiring `mapResult` for non-paginated overload.

### v1.13.2

- Added default OAuth URLs for Google, Jira, and Zoom

### v1.13.1

- Fixed `useFetch` type for non-paginated overload.

### v1.13.0

- Added pagination support to `usePromise`, `useCachedPromise` and `useFetch`.

### v1.12.5

- Add string array support for OAuth scope (Thanks @tonka3000!).

### v1.12.4

- Add `tokenResponseParser` and `tokenRefreshResponseParser` in the options of `OAuthService`.
- Fix built-in Slack OAuthServices.

### v1.12.3

- Fixed bodyEncoding for some built-in OAuthServices.

### v1.12.2

- Fixed types for `OAuthService.slack`.

### v1.12.1

- Fixed the refresh flow of `OAuthService` that would return outdated tokens.

### v1.12.0

- Removed some default OAuth clientIDs that could not work with generic scopes.
- Fixed `withAccessToken` when used in no-view commands.

### v1.11.1

- Fixed Google OAuth configuration.

### v1.11.0

- Added the [OAuth utils](./oauth/README.md).

### v1.10.1

- Fix an issue where the values passed to the `reset` function of the `useForm` hook wouldn't be respected.

### v1.10.0

- Add a new [`showFailureToast`](./functions/showFailureToast.md) function.

### v1.9.1

- Fix an issue where `useForm`'s `reset` function would not reset the value of some fields (which defeats its purpose...)

### v1.9.0

- Add a new [`useFrecencySorting`](./react-hooks/useFrecencySorting.md) hook.
- Change the default `options.timeout` of `useExec` to 10s.

### v1.8.0

- Add a new [`runAppleScript`](./functions/runAppleScript.md) function.
- Change the default `options.timeout` of `useExec` to 10s.

### v1.7.1

Change the signature of [`getProgressIcon`](./icons/getProgressIcon.md) to accept a `Color` in addition to a string for the `options.background`.

### v1.7.0

Change the signature of [`getProgressIcon`](./icons/getProgressIcon.md) to accept a `Color` in addition to a string for the `color`.

### v1.6.0

Added the [`useAI`](./react-hooks/useAI.md) hook.

### v1.4.0

Added the [`useSQL`](./react-hooks/useSQL.md) hook.

### v1.3.1

- Added the `reset` method to `useForm`.

### v1.3.0

- Added the `focus` method to `useForm`.
- Added the `input` option to `useExec`.

### v1.2.0

Added [`useExec`](./react-hooks/useExec.md) and [`useForm`](./react-hooks/useForm.md) hooks.

### v1.1.0

Added [`getFavicon`](./icons/getFavicon.md) method.

### v1.0.0

First release of the utilities.
