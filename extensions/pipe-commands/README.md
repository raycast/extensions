# Raycast Pipe commands

## Using Pipe commands

Select a some text, an url or a file and use the `Send Selection to Pipe command` command.

Depending on the user selection type, different commands will be shown.

## Adding additional Actions

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the script command syntax, with some caveats:

- Only some field are supported (title, description, packageName, author, authorUrl)
- A new field is introduced: `@raycast.selection`. It is similar to the script command arguments, but support other types.

| field          | description       | required |
| -------------- | ----------------- | -------- |
| type           | text, url or file | ✅        |
| percentEncoded |                   | ❌        |

Every unsupported Fields will be ignored by the extensions.
