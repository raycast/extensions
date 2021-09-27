---
description: Start building your perfect tools with the Raycast API.
---

# Introduction

Welcome, developers! Our docs cover guides, examples, references and more to help you build extensions and share them with our community.

This API enables you to create a custom Raycast extension using our TypeScript API. Your extension can be installed in Raycast and its commands will appear in Raycast root search. Using our CLI dev tool, the TypeScript code is compiled into a package containing JavaScript and then loaded into Raycast at runtime. Each command runs in its own isolated environment on the Node.js runtime and can interact with Raycast and the host environment through the API. Commands can define a user interface that will be rendered with native components \(no web view\).

Over time, and as this API will is being further developed, more and more features will become available. Our mission is to build a rich API that will cover many use cases for your custom productivity tools, and later allow distribution, sharing, and discovery of commands through a store.

Let's get started!

### Public beta

The Raycast platform is currently in public beta. We stabilised it during a private alpha and continue to work closely with our community together to absolutely nail it. If you want to have a saying in what we should build next, join our [Slack workspace](https://raycast.com/community) and meet other productivity nerds.

### Key features

* **Powerful and familiar tooling:** Extensions are built with JavaScript/TypeScript, React and Node. Leverage npm's ecosystem to quickly build what you imagine.
* **No-brainer to build UI:** You concentrate on the logic, we push the pixels. Use our built-in UI components to be consistent with all our extensions. 
* **Collaborate with our community:** Build your extension, share it with our community and get inspired by others.
* **Developer experience front and foremost:** A strongly typed API, hot-reloading and familiar tooling make it a blessing to extend Raycast your way.

### Overview

A quick overview about where to find what in our docs.

Learn how to build extensions in our step-by-step [guides](guides/getting-started.md).

Kickstart your extension by using an open source example.

Go into details with the API reference that includes code snippets.

