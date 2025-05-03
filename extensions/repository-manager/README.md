# Project Manager

This extension is aiming to be a manager for all your local projects

## Requisites
For a project to show up in the list it must be a valid git repo (it checks if exists a `.git` folder)

## Config
Every project can have a customized config which tweaks the behaviour of the commands

For example you can define custom url placeholders with `dynamicUrlElements` to replace inside the template

In the case below the `{project}` placeholder will be replaced with `custom-value`

If `{project}` placeholder is not overwritten then the name key will be used as default

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
- `apps`: valid options are `editor` and `terminal`
- `urls`: as shown above, you can reference any url present in `urls` by key `{urls.local}`

you can completely omit `urls` key if you don't want to open the project in a browser
or you can provide `terminal` inside apps array to also open it inside your terminal app

```json
"developmentCommand": { "apps": ["editor", "terminal"] }
```

## Projects caching
Since this extension performs quite a lot of reads from the file system, it might be useful to enable projects caching in the extension preferences to avoid re-scanning every time the command is launched.

The cache can be manually cleared with the `Clear Cache` command (`⌘` + `⇧` + `⌫`)

## Window resizing
In the extension preferences there is an option to enable window resizing/positioning which works only on the editor window
