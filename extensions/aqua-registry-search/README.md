# Aqua Registry Search

Search the [Aqua Registry](https://github.com/aquaproj/aqua-registry) for CLI tools without leaving Raycast. Results include package descriptions, package types, binaries, supported platforms, and links back to their registry definitions.

## Search and Inspect Packages

Search by package identifier, description, repository, path, binary, or supported environment. Keep the details panel open for full package metadata, or toggle it off for a compact results list.

Every registry entry is searched, with up to 100 matching results displayed at once to keep Raycast responsive.

The extension supports every registry entry shape, including packages identified by a GitHub repository, a custom name, or a Go module path.

## Actions

- **Copy Add Command** copies `aqua g -i <package>`, which adds the selected package to `aqua.yaml`.
- **Copy Package Name** copies the registry package identifier.
- **Open Registry Page** opens the package definition in the Aqua Registry.
- **Open Repository** and **Open Homepage** appear when those links are available.
- **Toggle Details** switches between detailed and compact results.

Learn more about adding packages in the [Aqua documentation](https://aquaproj.github.io/docs/tutorial/search-packages/).

## Attribution

The Aqua logo was created by [@vadasambar](https://github.com/vadasambar), sourced from [aquaproj/aqua](https://github.com/aquaproj/aqua/tree/f3bf1f880037979f45d5b66704c9b58d74b7b134/logo), and is licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). The canonical mark is used unchanged; the surrounding tile and search badge are extension artwork.
