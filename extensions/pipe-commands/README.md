# Raycast Pipe commands

## Using Pipe commands

Select a some text, an url or a file and use the `Send Selection to Pipe command` command.

Depending on the user selection type, different commands will be shown.

## Adding additional Actions

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the script command syntax, with some caveats:

- Only the `title` and `packageName` fields are parsed (the other fields are ignored)
- A new field is introduced: `@raycast.selection`. It is similar to the script command arguments, but support other types.

  | field          | description                                    | values            | required |
  | -------------- | ---------------------------------------------- | ----------------- | -------- |
  | type           | What type of selection the pipe command handle | text, url or file | ✅        |
  | percentEncoded | useful for query strings                       | boolean           | ❌        |

## Pipe Commands logic

The user selection will be passed to the script as the first argument.

If the selection of the user is composed of multiple items, multiple args will be provided to the script.

When manipulating text selections, the output of the script will replace the user selection.

## Example scripts

### Google Search

```bash
#!/bin/bash

# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.selection {"type": "text", "percentEncoded": true}

open "https://www.google.com/search?q=$1"
```

### Switch to Uppercase

```python
#!/usr/bin/env python3

# @raycast.title Switch to Uppercase
# @raycast.packageName Change Case
# @raycast.selection {"type": "text"}

import sys

selection = sys.argv[1]
sys.stdout.write(selection.upper())
```
