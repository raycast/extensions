---
description: Answers to the most frequently asked questions.
---

# FAQ

## What's the difference between [script commands](https://github.com/raycast/script-commands) and extensions?

## Why can I not use `react-dom`?

Even though you write JS/TS code, everything is rendered natively in Raycast. There isn't any HTML or CSS involved. Therefore you don't need the DOM-specific methods that the `react-dom` package provides. 

Instead, we implemented a custom [reconciler](https://reactjs.org/docs/reconciliation.html) that converts your React component tree in a render tree that Raycast understands. The render tree is used natively to construct a view hierarchy that is backed by [Apple's AppKit](https://developer.apple.com/documentation/appkit/). This is similar to how [React Native](https://reactnative.dev) works.

