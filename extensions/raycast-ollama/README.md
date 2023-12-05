<p align="center">
    <img src="assets/icon.png" height="128">
    <h1 align="center">Raycast Ollama</h1>
</p>

Use [Ollama](https://ollama.ai) for local llama inference on Raycast.

## Requirements

[Ollama](https://ollama.ai) installed and running on your mac. At least one model need to be installed throw Ollama cli tools or with 'Manage Models' Command. You can find all available model [here](https://ollama.ai/library).

## How to Use

### Command: Chat With Ollama

Chat with your preferred model from Raycast, with the following features:

- Save conversation with `CMD+S` keyboard shortcut. You can access your saved conversation with `CMD+P` keyboard shortcut.
- Change model with `CMD+M` keyboard shortcuts. For embedding is recommended to use a lower parameters model for better performance.
- Copy your Question, Answer or even the entire Chat to the clipboard.
- Is now possible to ask the model about one or more files. Select the files using `CMD+F`, at this stage only text based files and PDF are supported. And finally use tag `/file` for query about selected files. By default it use 'Stuff' Chain, you can change Chain type from 'Document Loader' submenu. This feature is currently experimental.

### Command: Create Custom Commands

With '***Create Custom Command***' you can create your own custom Command using whatever model you want.
