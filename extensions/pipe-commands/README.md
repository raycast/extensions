# Raycast Pipe commands

## Using Pipe commands

Select a some text, an url or a file and use the `Send Selection to Pipe command` command.

Depending on the user selection type, different commands will be shown.

## Adding additional Actions

Use the `Create Pipe command` command to generate a new pipe command template.

The Pipe command syntax is very similar to the script command syntax, with some caveats:

- Only some params are supported (title, description, packageName and argument1)
- secure, optional and placeholder params of the argument fields are not supported
- Pipe commands support different types of arguments:
  - text: the user text selection
  - url: a valid url
  - file: a file path

Every unsupported Fields will be ignored by the extensions
