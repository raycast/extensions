# Raycast Pipe Commands

## Using Pipe Commands

Select / Copy a some text, an url or a file and use the `Send [Selection, Clipboard] to Pipe command` command.

Depending on the user input type, different commands will be shown.

## Adding Additional Pipe Commands

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the script command syntax, with some caveats:

- Only the `title`, `icon`, currentDirectoryPath, `argument1` and `packageName` fields are parsed (the other fields are ignored, you can still provide them for documentation !). Some fields slight differ:
  - The icon field only accepts Raycast API Icons (ex: `Globe`, `Trash`...) instead of emoji and images paths.
  - The argument1 object only accept some fields:

  | field          | description                                | values       | required |
  | -------------- | ------------------------------------------ | ------------ | -------- |
  | type           | What type of input the pipe command handle | text or file | ✅       |
  | percentEncoded | useful for query strings                   | boolean      | ❌       |

## Pipe Commands Logic

The user input (selection or clipboard) will be passed as the script first argument. It will also be passed as the script stdin for convenience.

The standard output stream (`stdout`) of the script will replace the current selection, be copied to the clipboard or be passed to a another pipe command depending on the user choice. If the command does not return any output, the selection will be preserved.

If you want to provide a message to the user, use the standard error stream (`stderr`). It will trigger a notification on the user end.

## Example Commands

### Google Search

```bash
#!/bin/bash

# @raycast.title Google Search
# @raycast.packageName Web Searches
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
# @raycast.icon Hammer
# @raycast.argument1 {"type": "text"}

# This script get the input from stdin
python3 -m json.tool --indent 2
```
