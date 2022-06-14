# Raycast Pipe Commands

## Using Pipe Commands

Select / Copy some text and use the `Pipe [Selection, Clipboard] to Command` command.

Depending on the input type, different actions will be shown.

## Adding Additional Pipe Commands

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the [script command syntax](https://github.com/raycast/script-commands/blob/master/README.md), with some caveats:

- The `inline`, `fullOutput` and `compact` modes are not supported.
- A new `pipe` mode is introduced
- The `refreshTime`, `argument2`, `argument3` fields are not supported and will be ignored

![mode illustration](./medias/modes.excalidraw.png)

## Pipe Mode Logic

The user input (text selection or clipboard) will be passed as the script first argument.

If it is not empty, the standard output stream of the script will be copied to the clipboard or replace the current selection depending on the user choice.

## Example Commands

### Google Search

```bash
#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.mode silent
# @raycast.icon 🌐
# @raycast.argument1 {"type": "text", "percentEncoded": true, "placeholder": "Query"}

# Open the url in the default browser
open "https://www.google.com/search?q=$1"
```

### Format JSON

```python
#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Prettify JSON
# @raycast.packageName Developer Utils
# @raycast.mode pipe
# @raycast.icon 🔨
# @raycast.argument1 {"type": "text", "placeholder": "JSON to format"}

python3 -m json.tool --indent 2 <<< "$1"
```
