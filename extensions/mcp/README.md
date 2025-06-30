# Model Context Protocol for Raycast

Interact with Anthropic's Model Context Protocol in Raycast AI!

Install MCP servers, and use the Tools they expose directly in Quick AI or AI Chat.

# Documentation

Here's how to add Servers, and also how to use servers.

## Adding a Server via UI

1. Find a Server to download. Let's use the [`filesystem` server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) as an example
2. In the Server documentation, find the code to add to the Claude desktop configuration. Only copy the inner section of the JSON, so that the top-level key is the name of the server. It should look something like this:
  ```json
  {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Desktop",
        "/path/to/other/allowed/dir"
      ]
    }
  }
  ```
3. Go into the **Manage MCP Servers** command, and press <kbd>Cmd</kbd> + <kbd>N</kbd>
4. Paste the JSON in the textbox. Ensure to modify any fields that need changing, including API keys, or, in this case, the allowed directories. Submit the form.
5. Your server is ready to go!

> In the list of Servers, you should be able to see your new server, and the service that it uses. In our case, it would show "Uses npx"

Read on to learn how to add servers by directly modifying the config file or to code your own servers.

Or, skip to _Using MCP Servers in Raycast AI_ at the bottom for information about using MCP in Raycast AI.

## Modifying the Config File

All non-development servers are stored in a single configuration file named `mcp-config.json` in the Extension's support directory. It follows a similar pattern to Claude's desktop app's MCP config file.

You can find it by going into the **Manage MCP Servers** command, and selecting the **Show Config File in Finder** Action. By default, it looks like this (without the comment):

```json
{
  "mcpServers": {
    // Server JSON here
  }
}
```

In the `mcpServers` JSON, you can add all your servers. For example, here's what it would look like with `sequential-thinking` and `filesystem`.

```json
{
	"mcpServers": {
		"sequential-thinking": {
			"command": "npx",
			"args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
		},
		"filesystem": {
			"command": "npx",
			"args": [
				"-y",
				"@modelcontextprotocol/server-filesystem",
				"/Users/evan/Desktop"
			]
		}
	}
}
```

Using the UI does the editing for you, but this can be easier for modifications.

## Adding a Local/Development Server

You can also write code for your own custom server. Start by creating a new subfolder in the Servers Folder. You can find this folder by going to the **Manage MCP Servers** command, then using the **Open Servers Folder** action. Note that this is the folder that the `mcp-config.json` is in.

In your new subfolder, you should write the correct MCP server code in an `index.js` file. The Raycast MCP extension will automatically pick up on it the next time it runs.

For inspiration of what your Server should look like, see an example in the MCP GitHub, for the [`filesystem` extension](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem).

Note that only JS is supported for now, so you should write it in JS. Ensure you have a `package.json` in the folder. If you have not run `npm install`, the extension will automatically do it for you.

## Using MCP Servers in Raycast AI

As long as you have the correct servers installed, you can use any of your MCP tools just by invoking Raycast AI with the `@mcp` prefix.

The extension will automatically show Raycast AI all the available Servers, and Raycast AI will choose and use the proper tool. No additional setup needed!