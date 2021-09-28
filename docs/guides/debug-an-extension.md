---
description: This guide covers how to find and fix bugs in your extension.
---

# Debug an extension

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

### Unhandled exceptions and promise rejections

All unhandled exceptions and promise rejections are shown with an error overlay in Raycast. 

![Unhandled exception in development mode](../.gitbook/assets/cleanshot-2021-09-28-at-10.06.46-2x.png)

During development, we show the stack trace and add an action to jump to the error to make it easy to fix it. In production, only the error message is shown. You should [show a toast](../api-reference/user-interface/toast.md#showtoast) for all expected errors, e.g. a failing network request.

### React Developer Tools

We support [React Developer Tools](https://github.com/facebook/react/tree/main/packages/react-devtools) out-of-the-box. Use the tools to inspect and change the props of your React components, and see the results immediately in Raycast. This is especially useful for complex commands with a lot of state. 

![React Developer Tools](../.gitbook/assets/cleanshot-2021-09-09-at-5.18.55-2x.png)

To get started, add the `react-devtools` to your extension. Open a terminal, navigate to your extension directory and run the following command:

```typescript
npm install --save-dev react-devtools
```

Then re-build your extension with `npm run dev`, open the command you want to debug in Raycast and launch the React Developer Tools with `⌘` `⌥` `D`. Now select one of the React components, change a prop in the right sidebar and hit enter. You'll notice the change immediately in Raycast.

{% hint style="info" %}
You notice a few React components that are prefixed with `Internal` which we add automatically. Generally you shouldn't need to worry about them.
{% endhint %}

#### Alternative: Global installation of React Developer Tools

If you prefer to install the `react-devtools` globally, you can do the following:

```bash
npm install -g react-devtools
```

Then you can run `react-devtools` from a terminal to launch the standalone DevTools app. Raycast connects automatically and you can start debugging your component tree.

