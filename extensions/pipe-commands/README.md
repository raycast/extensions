# Raycast Pipe Commands

## Using Pipe Commands

Select / Copy a some text, an url or a file and use the `Send [Selection, Clipboard] to Pipe command` command.

Depending on the user input type, different commands will be shown.

## Adding Additional Pipe Commands

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the script command syntax, with some caveats:

- Only the `title`, `icon` and `packageName` fields are parsed (the other fields are ignored, you can still provide them for documentation !)
  - The icon field only accepts Raycast API Icons (ex: `Globe`, `Trash`...) instead of emoji and images paths.
- A new field is introduced: `@raycast.input`. It is similar to the script command arguments, but support other types.

  | field          | description                                | values       | required |
  | -------------- | ------------------------------------------ | ------------ | -------- |
  | type           | What type of input the pipe command handle | text or file | ✅       |
  | percentEncoded | useful for query strings                   | boolean      | ❌       |

## Pipe Commands Logic

The user input (selection or clipboard) will be passed to the script through the standard input stream (`stdin`).

The standard output stream (`stdout`) of the script will replace the current selection, be copied to the clipboard or be passed to a another pipe command depending on the user choice. If the command does not return any output, the selection will be preserved.

If you want to provide a message to the user, use the standard error stream (`stderr`). It will trigger a notification on the user end.

## Example Commands

### Google Search

```bash
#!/bin/bash

# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.icon Globe
# @raycast.input {"type": "text", "percentEncoded": true}

# Assign the script input to a bash variable
read -r query
# Open the url in the default browser
open "https://www.google.com/search?q=$query"
```

### Switch to Uppercase

```python
#!/usr/bin/env python3

# @raycast.title Switch to Uppercase
# @raycast.packageName Text Actions
# @raycast.icon Text
# @raycast.input {"type": "text"}

import sys

selection = sys.stdin.read()
sys.stdout.write(selection.upper())
```
