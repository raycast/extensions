---
description: Answers to the most frequently asked questions.
---

# FAQ

<details>

<summary>What's the difference between <a href="https://github.com/raycast/script-commands">script commands</a> and extensions?</summary>

Script commands were the first way to extend Raycast. They are a simple way to execute a shell script and show some limited output in Raycast. Extensions are our next iteration to extend Raycast. While scripts can be written in pretty much any scripting language, extensions are written in TypeScript. They can show rich user interfaces like lists and forms but can also be "headless" and just run a simple script.

Extensions can be shared with our community via our Store. This makes them easy to discover and use for not so technical folks that don't have homebrew or other shell integrations on their Mac.

</details>

<details>

<summary>Why can I not use <code>react-dom</code>?</summary>

Even though you write JS/TS code, everything is rendered natively in Raycast. There isn't any HTML or CSS involved. Therefore you don't need the DOM-specific methods that the `react-dom` package provides.

Instead, we implemented a custom [reconciler](https://reactjs.org/docs/reconciliation.html) that converts your React component tree to a render tree that Raycast understands. The render tree is used natively to construct a view hierarchy that is backed by [Apple's AppKit](https://developer.apple.com/documentation/appkit/). This is similar to how [React Native](https://reactnative.dev) works.

</details>

<details>

<summary>Can I import ESM packages in my extension?</summary>

Yes, but you need to convert your extension to ESM.

Quick steps:

- Make sure you are using TypeScript 4.7 or later.
- Add `"type": "module"` to your package.json.
- Add `"module": "node16", "moduleResolution": "node16"` to your tsconfig.json.
- Use only full relative file paths for imports: `import x from '.';` → `import x from './index.js';`.
- Remove `namespace` usage and use `export` instead.
- Use the [`node:` protocol](https://nodejs.org/api/esm.html#esm_node_imports) for Node.js built-in imports.
- **You must use a `.js` extension in relative imports even though you're importing `.ts` files.**

</details>
