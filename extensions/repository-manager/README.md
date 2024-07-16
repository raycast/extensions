# Project Manager

This extension is aiming to be a manager for all your local projects

## Requisites
For a project to show up in the list it must be a valid git repo (it checks if exists a `.git` folder)

## Config
Every project can have a customized config which tweaks the behaviour of the commands

For example you can define custom urls with `dynamicUrlElements` to replace inside the template

```json
{
    "name": "project name",
    "description": "custom description used in detail page",
    "urls": {
        "local": "{project}.test",
        "production": "{project}.com"
    },
    "dynamicUrlElements": [{ "key": "project", "value": "custom-value" }],
    "developmentCommand": { "apps": ["editor"], "urls": ["{urls.local}"] }
}
```
### Development command
`developmentCommand` has two keys:
- `apps`: valid options are `editor`, `terminal`
- `urls`: as shown above, you can reference any url present in `urls` by key `{urls.local}`

## Projects caching
Since this extension performs quite a lot of reads from the file system, it might be useful to enable projects caching in the extension preferences to avoid re-scanning every time the command is launched.

The cache can be manually cleared with the `Clear Cache` command (`⌘` + `⇧` + `⌫`)

## Window resizing
In the extension preferences there is an option to enable window resizing/positioning which works only on the editor window
