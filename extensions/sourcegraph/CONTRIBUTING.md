# Contributing

[![Pipeline](https://github.com/bobheadxi/raycast-sourcegraph/actions/workflows/pipeline.yml/badge.svg)](https://github.com/bobheadxi/raycast-sourcegraph/actions/workflows/pipeline.yml)

This plugin is developed in the [`bobheadxi/raycast-sourcegraph` repository](https://github.com/bobheadxi/raycast-sourcegraph), _not_ in the `raycast/extensions` repository where [releases are published](#publishing-to-the-raycast-store).

Clone the [Sourcegraph for Raycast repository](https://github.com/bobheadxi/raycast-sourcegraph) and use the ["Import Extension" command in Raycast](https://developers.raycast.com/basics/import-an-extension#import-the-extension) to point to your clone of this repository. In this repository, then run:

```sh
npm install
npm run dev
```

The "Search Sourcegraph" command should now be available within Raycast.

## Code style

[Prettier](https://prettier.io/) is used for code style, and a formatting command is available:

```sh
npm run fmt
```

Checks can be run with:

```sh
npm run lint
```

## Changelog style

See the [Raycast version history guide](https://developers.raycast.com/basics/prepare-an-extension-for-store#version-history).

## Screenshots

Screenshots for the Raycast store are in the [`metadata/` directory](./metadata/). See the [Raycast extension screenshots guide](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots).

The current screenshot samples are:

1. Search `context:cncf store (type:file OR type:symbol)`
2. Search `r:^github\.com/etcd\-io/etcd$ f:etcdutl/etcdutl/snapshot_command\.go type:symbol store` -> select first result
3. Notebooks `actor propagation` -> preview
4. Batch Changes -> find random batch change with mix of merged and unmerged changesets

## Publishing to the Raycast store

The latest release of this extension is published to [`extensions/sourcegraph` in `raycast/extensions`](https://github.com/raycast/extensions/tree/main/extensions/sourcegraph).

To make a release, set up a clone of the [Raycast extensions repository](https://github.com/raycast/extensions) and create a new branch:

```sh
export RAYCAST_FORK="git@github.com:$REPO.git"
export RAYCAST_EXTENSIONS_DIR="../../raycast/extensions"
mkdir -p $RAYCAST_EXTENSIONS_DIR
cd $RAYCAST_EXTENSIONS_DIR

git clone --no-checkout --filter=blob:none $RAYCAST_FORK .
git sparse-checkout init --cone
git sparse-checkout set extensions/sourcegraph
git checkout main

cd - # back to raycast-sourcegraph
```

Then, in your clone of the `raycast-sourcegraph` repository:

```sh
# check that a build works successfully
npm run build
# copy repo into publish directory
npm run raycast-publish
```

Then open a pull request upstream and follow the steps in the pull request template.
