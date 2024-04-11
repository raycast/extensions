# Raycast Utilities

In addition to the [Raycast API](../api-reference/cache.md) which is bundled as part of the app, we also provide a sibling package that contains a set of utilities to streamline common patterns and operations used in extensions.

![](../.gitbook/assets/utils-illustration.jpg)

## Installation

This package can be installed independently using `npm`.

```
npm install --save @raycast/utils
```

`@raycast/utils` has a [peer dependency](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#peerdependencies) on `@raycast/api`. This means that a certain version of `utils` will require a version above a certain version of `api`. `npm` will warn you if that is not the case.

## Changelog

### v1.14.0

- Add `useStreamJSON` hook.

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
