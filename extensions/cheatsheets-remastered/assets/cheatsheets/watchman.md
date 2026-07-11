---
title: Watchman
updated: 2017-10-18T00:00:00.000Z
weight: -1
keywords:
  - watchman watch ~/src
  - watchman watch-list
  - 'watchman -- trigger ~/rsc remake ''*.js'' -- make '
tech: watchman
status: active
lastReviewed: '2025-09-05'
---

### Getting started

```bash
watchman watch ./src
```

Adds `./src` to the watch list.

```bash
watchman -- trigger ./src retest '*.js' -- npm test
```

Adds a trigger called `retest` to run `npm test` every time `*.js` changes in `./src`.

### Watching

```
watchman watch ~/src
watchman watch-list
watchman watch-del ~/src
```

## Also see

 * [Documentation](https://facebook.github.io/watchman/docs/install.html) _(facebook.github.io)_
