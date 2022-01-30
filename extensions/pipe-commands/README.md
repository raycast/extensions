# Raycast Pipe commands

## Using Pipe commands

Select a some text, an url or a file and use the `Send [Selection, Clipboard] to Pipe command` command.

Depending on the user input type, different commands will be shown.

## Adding additional Actions

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the script command syntax, with some caveats:

- Only the `title` field is parsed (the other fields are ignored)
- A new field is introduced: `@raycast.input`. It is similar to the script command arguments, but support other types.

  | field          | description                                    | values            | required |
  | -------------- | ---------------------------------------------- | ----------------- | -------- |
  | type           | What type of input the pipe command handle | text, url or file | ✅        |
  | percentEncoded | useful for query strings                       | boolean           | ❌        |

## Pipe Commands logic

The user input (selection or clipboard) will be passed to the script through the standard input stream (stdin).
The standard output stream (stdout) of the script will replace the current selection, or replace the clipboard depending on the user choice.
If you want to provide a message to the user, use the standard error stream (stderr).

## Example scripts

### Google Search

```bash
#!/bin/bash

# @raycast.title Google Search
# @raycast.input {"type": "text", "percentEncoded": true}

read -r query
open "https://www.google.com/search?q=$query"
```

### Switch to Uppercase

```python
#!/usr/bin/env python3

# @raycast.title Switch to Uppercase
# @raycast.input {"type": "text"}

import sys

selection = sys.stdin.read()
sys.stdout.write(selection.upper())
```
