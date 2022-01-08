---
description: Learn how to build your first extension and use it in Raycast.
---

# Create Your First Extension

### Create a new extension

Open the Create Extension command, name your extension "Hello World" and select the "Hello World" template. Pick a parent folder in the Location field and press `⌘` `↵` to continue.

![Create a new extension](../.gitbook/assets/basics-create-extension.png)

Next, you'll need to follow the on-screen instructions to build the extension.

### Build the extension

Open your terminal, navigate to your extension directory and run `npm install && npm run dev`. Open Raycast and you'll notice your extension at the top of the root search. Press `↵` to open it.

![Your first extension](../.gitbook/assets/basics-build-extension.png)

### Develop your extension

To make changes to your extension, open the `./src/index.tsx` file in your extension directory, change the `markdown` text and save it. Then, open your command in Raycast again and see your changes. 

{% hint style="info" %}
`npm run dev` starts the extension in development mode with hot reloading, error reporting and [more](../information/cli.md#development).
{% endhint %}

### Use your extension

Now, you can press `⌃` `C` in your terminal to stop `npm run dev`. The extension stays in Raycast and you can find it's commands in the root when searching for the extension name "Hello World" or the command name "Render Markdown". 

![Find your extension in the root search](../.gitbook/assets/basics-use-extension.png)

🎉 Congratulations! You built your first extension. Off to many more.

{% hint style="info" %}
Don't forget to run [`npm run dev`](../information/cli.md#development) again when you want to change something in your extension.
{% endhint %}

