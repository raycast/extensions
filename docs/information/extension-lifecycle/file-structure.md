# File structure

An extension consists of an entry point file \(e.g. `src/index.ts`\) per command and a `package.json` manifest file that holds metadata about the extension and its commands. The format of the manifest file is very similar to [that of npm packages](https://docs.npmjs.com/cli/v7/configuring-npm/package-json). In addition to some of the standard properties, a `commands` property describes which commands an extension exposes to Raycast root search and how they are presented. Each command has a property `name` that maps to its main entry point file in the `src` folder \(e.g. a command with name "`create`" would map to `src/create`\).

TypeScript is the recommended language for extensions; however, plain JavaScript commands are also supported by using the `js` file extension for the entry point. The supported file extensions are `ts`, `tsx`, `js`, and `jsx`. Extensions using React tags should be `.tsx` or `.jsx`.

An `assets` folder can hold icons and images that will be packaged into the command and can be referenced at runtime, for example the icon for the command or other icons for lists and the action panel.

