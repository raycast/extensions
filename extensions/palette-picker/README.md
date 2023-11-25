# Tailwind Color Picker

A simple color picker for Tailwind CSS and Radix UI color palettes.

## How it works

The extension is built in 2 parts:

1. A Swift package that provides a native color picker. The picked color is then logged to stdout.
2. The actual Raycast extension which invokes the native color picker, reads the stdout to get the picked RGBA color. It then translates the color to the closest color in the Tailwind or Radix UI color palette.

## Devlopment

This is a Turborepo with two workspaces, the root Raycast extension as well as a Swift package for the color picker.

1. Install deps

```bash
npm install
```

1. Build everything (Turbo will cache so the native package isn't compiled over and over)

```bash
npx turbo build
```

3. Run the extension

```bash
npm run dev
```

You will then see the `Pick Radix Color` & `Pick Tailwind Color` commands in Raycast.