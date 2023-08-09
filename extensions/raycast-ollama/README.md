# Raycast Ollama

Use [Ollama](https://ollama.ai) for local llama inference on Raycast.

## Requirements

1. Ollama installed and running.
2. At least orca 3b model installed (is the default one).

```bash
ollama pull orca
```

## Use a different model

This plugin allows you to select a different model for each command. Keep in mind that you need to have the corresponding model installed on your machine.

Install orca 3b

```bash
ollama pull orca
```

Install llama2 7b

```bash
ollama pull llama2
```

Install llama2 13b

```bash
ollama pull llama2:13b
```

## Create your own custom commands

With '***Create Quicklink***' and '***Custom Command***' you can create your own custom command with a specific prompt.

1. Create a Quicklink.
2. On ***Name*** use whatever name you want.
3. On ***Link*** use the following deeplink `raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-custom-command?{prompt :}` end insert your custom prompt after `:`. Use `\n` if you need a new line.
4. On  ***Open With*** select ***Raycast.app***.
5. On first launch will be prompted asking if you what to open the command, type ⌘+enter for not asking again.

## Create your own chatbot

With '***Create Quicklink***' and '***Ask Ollama with Custom Prompt***' you can create your own chatbot with a specific prompt.

1. Create a Quicklink.
2. On ***Name*** use whatever name you want.
3. On ***Link*** use the following deeplink `raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-custom-ask?{prompt :}` end insert your custom prompt after `:`. Use `\n` if you need a new line.
4. On  ***Open With*** select ***Raycast.app***.
5. On first launch will be prompted asking if you what to open the command, type ⌘+enter for not asking again.
