# Foundry `Cast` Raycast Extension

Use the Cast CLI directly inside Raycast!

## Getting started

To use this extension, you need to have [Raycast](https://www.raycast.com/) and [Foundry](https://book.getfoundry.sh/getting-started/installation) installed on your machine.

### Local development / Usage

1. Clone this repo
2. Open Raycast and type the "Manage Extensions" command.
3. From there, select "Import Extension" and select the folder you just cloned.
4. Open a terminal in the cloned folder, and run `npm install && npm run dev` to start the extension in development mode.
5. You should now be able to use the extension locally!

## Features

- All `utility` commands
- All `wallet` commands
- All `ENS` commands
- All `account` commands
- All `ABI` commands

## TODO

- All `Block` commands
- All `Transaction` commands
- All `Conversion` commands

## Contributing

Contributions are more than welcome! Feel free to open an issue or a PR
if you want to add a feature or fix a bug.

The setup is pretty simple. I made a hook called `useCast` that handles everything, and you can
take a look at any file inside the `src` directory to see how it works. Here's a quick example:

```tsx
// Define the arguments that the command can take
const Arguments = {
  value: { required: true, name: "Value" },
} as const;

// Define the success message that will be displayed when the command is successful
const successMessage = "Copied keccak hash to clipboard";

export default function Command() {
  // invoke the hook with the command name, the arguments, and an optional success message
  const { isLoading, result, execute } = useCast("keccak", Arguments, { successMessage });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {/* call `execute` on form submission */}
          <Action.SubmitForm onSubmit={(v) => execute({ value: `"${v.value}"` })} />
          <Action.OpenInBrowser title="View Docs" url="https://book.getfoundry.sh/reference/cast/cast-keccak" />
          <Action.CopyToClipboard title="Copy hash to clipboard" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextField id="value" title="Data to hash" placeholder="hello world" info="The data you want to hash" />
    </Form>
  );
}
```

## License

All files within this repository are licensed under the MIT License unless explicitly stated otherwise.
