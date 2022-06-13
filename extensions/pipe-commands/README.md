# Raycast Pipe Commands

## Using Pipe Commands

Select / Copy some text and use the `Pipe [Selection, Clipboard] to Command` command.

Depending on the input type, different actions will be shown.

## Adding Additional Pipe Commands

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the [script command syntax](https://github.com/raycast/script-commands/blob/master/README.md), with some caveats:

- The `inline mode` is not supported.
- The `refreshTime`, `argument2`, `argument3` fields are not supported and will be ignored

> :information_source: Every Pipe Command is a valid Script Command, but the inverse is not true: some Script Commands cannot be used as Pipe Commands (ex: commands with an `inline` mode).

## Pipe Commands Logic

The user input (text selection or clipboard) will be passed as the script first argument.

The standard output stream (`stdout`) of the script will shown, replace the current selection or be copied to the clipboard.

If you want to provide a message to the user, use the standard error stream (`stderr`). It will trigger a notification on the user end.

## Example Commands

### Google Search

```bash
#!/bin/bash

# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.mode silent
# @raycast.icon Globe
# @raycast.argument1 {"type": "text", "percentEncoded": true}

# Open the url in the default browser
open "https://www.google.com/search?q=$1"
```

### Format JSON

```python
#!/bin/bash

# @raycast.title Prettify JSON
# @raycast.packageName Developer Utils
# @raycast.mode fullOutput
# @raycast.icon Hammer
# @raycast.argument1 {"type": "text"}

python3 -m json.tool --indent 2 <<< "$1"
```
