# Tailwind Color Picker

A simple color picker for Tailwind CSS.

## Getting started

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

You will then see the `Pick Color` command in Raycast.