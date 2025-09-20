<div align="center">
  <picture>
    <img alt="logo" height="128px" src="assets/icon@dark.png">
  </picture>
  <h1 align="center">Raycast Ollama</h1>
</div>

Use [Ollama](https://ollama.ai) for local llama inference on Raycast. This application is not directly affiliated with Ollama.ai.

## Requirements

[Ollama](https://ollama.ai) installed and running on your mac. At least one model need to be installed throw Ollama cli tools or with 'Manage Models' Command. You can find all available model [here](https://ollama.ai/library).

## How to Use

### Command: Manage Models

View, add, and remove models that are installed locally or on a configured remote Ollama Server. To manage and utilize models from the remote server, use the ***Add Server*** action.

### Command: Chat With Ollama

Chat with your preferred model from Raycast, with the following features:

- ***CMD+M***, *Change Model*: change model when you want and use different one for vision or embedding.
- ***CMD+S***, *Selection*: Add text from selection or clipboard to the prompt.
- ***CMD+B***, *Browser Selection Tab*: Add content from selected tab to the prompt. Raycast Browser Extension is required.
- ***CMD+I***, *Image From Clipboard*: Add jpeg or png image to the prompt. A Model with vision capabilities is required.
- ***CMD+F***, *File*: Add content from files. This feature is still experimental.

From extentions preferences you can chose how many messages use as memory. By default it use the last 20 messages.

### Command: Create Custom Commands

All preconfigured commands are crafted for general use. This command allow you to create a custom command for your specific needs.

Prompt use [Raycast Prompt Explorer](https://prompts.ray.so/) format with the following tags supported:

- ***{selection}***: Add text from selection or clipboard to the prompt.
- ***{browser-tab}***: Add content from selected tab to the prompt. Raycast Browser Extension is required. Page format can be changed between: markdown {browser-tab}, html {browser-tab format="html"}, text {browser-tab format="text"}.
- ***{image}***: Add jpeg or png image to the prompt. A Model with vision capabilities is required.

### Command: Manage Mcp Server

View, add, and remove MCP servers for use with "Chat With Ollama." Currently, only tools are supported. A model with tool capabilities is required.

This feature was tested with [duckduckgo-mcp-server](https://github.com/nickclyde/duckduckgo-mcp-server), which allows the model to search information on DuckDuckGo.
