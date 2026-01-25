# Raycast Extension Sample Using Swift

This repo contains a Raycast extension with TypeScript and Swift code. It demonstrates how to invoke Swift code from the React/TypeScript side and how exportable functions are defined in Swift.

> For further details, please check [Swift for Raycast Extensions](https://github.com/raycast/extensions-swift-tools).

This extension is very simple and it is comprised of:

- 7 Raycast commands defined in `package.json`.
- The Typescript code for each command in `src/`.
- The swift code in `swift/`.

## Usage

You can run the extension as follows:

1. Open Raycast and search for the `Import Extension` command.
2. Select the folder containing this repo code.
3. Build the extension.

   The easiest way to build is to search in Raycast for `Manage Extensions`, and select the `Start Development` action (⌘+B) on this extension.

4. Wait for a successful build and open Raycast to start using the commands.

Building the extension will produce the TypeScript interface for the Swift code.
