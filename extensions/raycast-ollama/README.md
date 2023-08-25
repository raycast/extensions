# Raycast Ollama

Use [Ollama](https://ollama.ai) for local llama inference on Raycast.

## Requirements

1. Ollama installed and running.
2. At least orca 3b and llama2 7b model installed (they are the default). Use 'Manage Models' commands for pulling images or ollama cli.

```bash
ollama pull orca
ollama pull llama2
```

## Use a different model

This plugin allows you to select a different model for each command. Keep in mind that you need to have the corresponding model installed on your machine. You can find all available model [here](https://gist.github.com/mchiang0610/b959e3c189ec1e948e4f6a1f737a1fc5).

## Create your own custom commands

With '***Create Custom Command***' you can create your own custom command or chatbot using whatever model you want.
