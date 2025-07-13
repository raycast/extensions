# Elixir

Navigate Elixir's documentation without leaving Raycast.

## Building Documentation

Run the `doc_builder.exs` script with `elixir doc_builder.exs`, this will output TypeScript files under `src/docs/`.

If you don't want to generate a file for each of Elixir's modules, you can also leverage the `--modules` flag for the
script and specify a list of modules for which you want documentation to be built, for example:

```sh
elixir doc_builder.exs --modules List,Map
```

This would only generate `src/docs/list.ts` and `src/docs/map.ts`.

It's worth noting that the the files won't be properly formatted, so it's recommended to run `prettier` on these files
after you've generated them with:

```sh
npx prettier --write src/docs/*.ts
```
