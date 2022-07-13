# SVGR

Paste in SVG. Get a react component.

This extensions uses [SVGR](https://react-svgr.com/) to take raw, unoptimized SVG code and convert it to an optimized React component.

## SVGR Options

You can customize the output of your react components with SVGR's options. You can reference the offical [SVGR docs](https://react-svgr.com/docs/options/) for further information on all of SVGR's options. This extension currently supports the following options that can be accessed with the "Customize SVGR Settings" action in the action panel.

| option name | default     | options                                      | more info                                                               |
| ----------- | ----------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| dimensions  | `true`      | `true` `false`                               | [dimensions](https://react-svgr.com/docs/options/#dimensions)           |
| icon        | `false`     | `true` `false`                               | [icon](https://react-svgr.com/docs/options/#icon)                       |
| memo        | `false`     | `true` `false`                               | [memo](https://react-svgr.com/docs/options/#memo)                       |
| native      | `false`     | `true` `false`                               | [native](https://react-svgr.com/docs/options/#native)                   |
| ref         | `false`     | `true` `false`                               | [ref](https://react-svgr.com/docs/options/#ref)                         |
| svgo        | `true`      | `true` `false`                               | [svgo](https://react-svgr.com/docs/options/#svgo)                       |
| titleProp   | `false`     | `true` `false`                               | [titleProp](https://react-svgr.com/docs/options/#title)                 |
| typescript  | `false`     | `true` `false`                               | [typescript](https://react-svgr.com/docs/options/#typescript)           |
| expandProps | `end`       | `"end"` `"start"` `false`                    | [expandProps](https://react-svgr.com/docs/options/#expand-props)        |
| exportType  | `"default"` | `"named"` `"default"`                        | Use `"named"` for a named export. Use `"default"` for a default export. |
| jsxRuntime  | `"classic"` | `"classic"` `"automatic"` `"classic-preact"` | [jsxRuntime](https://react-svgr.com/docs/options/#jsx-runtime)          |

## SVGO Options

You can customize your SVGO configuration file like you would any SVGO configuration. This extension uses a `.svgorc.json` file. You can open this file with the "Open SVGO Settings" action in the action panel. For more information on SVGO configuration:

- [SVGR's Documentation on SVGO](https://react-svgr.com/docs/options/#svgo-config)
- [SVGO Configuration](https://github.com/svg/svgo#configuration)
- [SVGO Built-in Plugins](https://github.com/svg/svgo#built-in-plugins)
  - You can currently only use SVGO's built-in plugins to customize your SVGO configuration file.

## Prettier Options

_This extension does not currently support the prettier option for SVGR._
