---
description: This guide covers how to find and fix bugs in your extension.
---

# Debug an Extension

Bugs are unavoidable. Therefore it's important to have an easy way to discover and fix them. This guide shows you how to find problems in your extensions.

### Console

Use the `console` for simple debugging such as logging variables, function calls or other helpful messages. All logs are shown in the terminal during [development mode](../information/cli.md#development). Here are a few examples:

```typescript
console.log("Hello World"); // Prints: Hello World

const name = "Thomas";
console.debug(`Hello ${name}`)'; // Prints: Hello Thomas

const error = new Error("Boom 💥");
console.error(error); // Prints: Boom 💥
```

For more, checkout the [Node.js documentation](https://nodejs.org/dist/latest-v16.x/docs/api/console.html).

We automatically disable console logging for store extensions.

### Unhandled exceptions and promise rejections

All unhandled exceptions and promise rejections are shown with an error overlay in Raycast.

![Unhandled exception in development mode](../.gitbook/assets/basics-unhandled-exception.png)

During development, we show the stack trace and add an action to jump to the error to make it easy to fix it. In production, only the error message is shown. You should [show a toast](../api-reference/user-interface/toast.md#showtoast) for all expected errors, e.g. a failing network request.

### React Developer Tools

We support [React Developer Tools](https://github.com/facebook/react/tree/main/packages/react-devtools) out-of-the-box. Use the tools to inspect and change the props of your React components, and see the results immediately in Raycast. This is especially useful for complex commands with a lot of state.

![React Developer Tools](../.gitbook/assets/basics-react-developer-tools.png)

To get started, add the `react-devtools` to your extension. Open a terminal, navigate to your extension directory and run the following command:

```typescript
npm install --save-dev react-devtools@4.21.0
```

Then re-build your extension with `npm run dev`, open the command you want to debug in Raycast and launch the React Developer Tools with `⌘` `⌥` `D`. Now select one of the React components, change a prop in the right sidebar and hit enter. You'll notice the change immediately in Raycast.

{% hint style="info" %}
You notice a few React components that are prefixed with `Internal` which we add automatically. Generally you shouldn't need to worry about them.
{% endhint %}

#### Alternative: Global installation of React Developer Tools

If you prefer to install the `react-devtools` globally, you can do the following:

```bash
npm install -g react-devtools@4.21.0
```

Then you can run `react-devtools` from a terminal to launch the standalone DevTools app. Raycast connects automatically and you can start debugging your component tree.

### Environments

By default, extensions installed from the store run in Node production mode and development extensions in development mode. In development mode, the CLI output shows you additional errors and warnings (e.g. the infamous warning when you're missing the React `key` property for your list items); performance is generally better when running in production mode. You can force development extensions to run in Node production mode by going to Raycast Preferences > Advanced > "Use Node production environment".

At runtime, you can check which Node environment you're running in:

```typescript
if (process.env.NODE_ENV === "development") {
  // running in development Node environment
}
```

To check whether you're running the store or local development version:

```typescript
import { environment } from "@raycast/api";

if (environment.isDevelopment) {
  // running the development version
}
```
