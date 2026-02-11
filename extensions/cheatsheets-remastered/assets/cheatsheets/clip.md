---
title: Command Line Interface Pages
category: CLI
updated: 2023-02-23T00:00:00.000Z
keywords:
  - CLI
tech: clip
status: active
lastReviewed: '2025-09-05'
---

### Page layout

```md
# command

> Some command description
> More information: https://some/link/to/url

- Some code description:

`command argument1 argument2`
```

### [Primitive placeholders](https://github.com/command-line-interface-pages/syntax/blob/main/type-specific/cli.md#primitive-placeholders)

```md
- Delay in [s]econds:

`sleep {int seconds: 2}s`
```

### [Primitive repeated placeholders](https://github.com/command-line-interface-pages/syntax/blob/main/type-specific/cli.md#repeated-primitive-placeholders)

```md
- [c]reate an archive and write it to a [f]ile:

`tar {option mode: --create, -c} {option: --file, -f} {/?file archive: target.tar} {/?path+ input}`
```

### Also see
{: .-one-column}

* [Render](https://github.com/command-line-interface-pages/v2-tooling/tree/main/clip-view)
* [Page's repository](https://github.com/command-line-interface-pages/cli-pages)
* [Syntax](https://github.com/command-line-interface-pages/syntax/blob/main/base.md)
