# Number to Stacks

A Raycast extension for converting Minecraft item counts into stacks and back. All calculations run locally.

## Install locally

Requires Raycast for Windows or macOS and Node.js 22.22.2 or newer.

```sh
npm install
npm run dev
```

The development command builds and imports the extension into Raycast. Open **Convert Minecraft Stacks** to use it. Leave the development process running while editing; changes reload automatically.

## Type “144 to stacks” in Raycast

1. Open Raycast's **Manage Fallback Commands** command.
2. Add **Convert Minecraft Stacks** to your fallback commands.
3. Type `144 to stacks` in Raycast's root search, then select **Convert Minecraft Stacks** and press Enter.
4. The command opens with **2 stacks and 16 items**. Press Enter again to copy it.

Fallback commands are offered when root search has no matching results. This extension shows its live result inside the opened command; it does not add custom units to Raycast's built-in calculator.

For a shortcut, find **Convert Minecraft Stacks** in Raycast Settings → Extensions and assign the alias `stacks`. Type `stacks`, press Space to focus its optional query argument, enter `144`, and press Enter. You can also open the command without an argument and type directly in its search field.

## Examples

Using 64 items per stack:

| Input                            | Result                |
| -------------------------------- | --------------------- |
| `144 to stacks`                  | 2 stacks and 16 items |
| `96`                             | 1 stack and 32 items  |
| `64`                             | 1 stack               |
| `32 items`                       | 32 items              |
| `0`                              | 0 items               |
| `2 stacks to items`              | 128 items             |
| `1.5 stacks`                     | 96 items              |
| `2 stacks and 16 items`          | 144 items             |
| `2 stacks and 16 items to items` | 144 items             |
| `1,024 to stacks`                | 16 stacks             |

Results update as you type. **Enter** copies the selected result. Use the dropdown beside the search field to choose **64** or **16 items per stack**. The extension remembers your selection, and that size applies to both directions.

Plain numbers always mean items → stacks. Include `stack` or `stacks` to convert back to items; `to items` is optional. Quantities must be non-negative, and item counts must be whole numbers. Fractional stacks are accepted only when they equal a whole number of items: `0.015625 stacks` is 1 item with 64-item stacks, while `0.1 stacks` shows a validation message. Calculations use exact integer arithmetic, including for decimal inputs and very large quantities. No rounding is applied. Arithmetic expressions such as `64 * 2` are not supported.

## Development

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

`npm run build` writes a production build to `dist`. `npm run bundle` creates a local `.rayext` archive. Neither command publishes anything.

## Publishing to the Raycast Store

The manifest already uses the Raycast handle `sergi`, the MIT license, a 512×512 icon, and a store-formatted changelog.

1. Log in once with `npx ray login`.
2. Run `npm run publish`.
3. The command forks [`raycast/extensions`](https://github.com/raycast/extensions), copies this extension into `extensions/number-to-stacks`, and opens a pull request.
4. Push fixes to the same PR by running `npm run publish` again. Once Raycast approves and merges, the extension appears in the store.

For the manual route, fork `raycast/extensions`, add this folder as `extensions/number-to-stacks` (without `node_modules` or `dist`), and open a pull request. Screenshots are optional but recommended: capture up to six 2000×1250 PNGs in development mode and place them in a `metadata` folder.

The test suite checks exact conversions, round trips for counts from 0–4,096 with both stack sizes, fallback and argument input, live edits, copy-action content, validation, and restoring the selected size. Component tests use a simulated Raycast host and storage; they do not verify the native clipboard or Raycast's fallback settings.

Built using Raycast's [command arguments](https://developers.raycast.com/information/lifecycle/arguments), [fallback launch text](https://developers.raycast.com/information/lifecycle), [List UI](https://developers.raycast.com/api-reference/user-interface/list), and [local-storage hook](https://developers.raycast.com/utilities/react-hooks/uselocalstorage).
