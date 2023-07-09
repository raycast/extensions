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
