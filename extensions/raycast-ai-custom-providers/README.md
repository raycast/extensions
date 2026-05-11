<p align="center">
<img width=180 src="./assets/extension-icon.png">
</p>

# Custom Provider (Bring Your Own Models)

A Raycast extension that allows you to manage custom AI provider settings through a convenient interface. The extension works with the `providers.yaml` file used by Raycast AI to configure external providers (*see documentation [here](https://manual.raycast.com/ai#Custom%20Providers%20(Bring%20Your%20Own%20Models))*).

## Features

- View a list of all configured providers
- View detailed information about each provider (models, API keys, additional parameters)
- Edit existing or add new providers and models

The extension automatically works with the Raycast AI configuration file located at:
```
~/.config/raycast/ai/providers.yaml
```

> For security purposes, a backup copy of the `providers.yaml` file is created before making changes.

## providers.yaml Structure

The `providers.yaml` file has the following structure:

```yaml
providers:
  - id: provider_id              # Unique provider identifier (required)
    name: Provider Name          # Provider name (required)
    base_url: https://api.example.com  # Base API URL (required)

    # API keys (optional)
    # If authentication is required, specify at least one key
    # If individual models require different keys, specify a separate `key` for each model
    api_keys:
      provider_key: ENV_VAR_NAME

    # Additional parameters for `/chat/completions` endpoint (optional)
    additional_parameters:
      param1: value1
      param2: value2

    # List of provider models (required, minimum 1 model)
    models:
      - id: model_id             # Model identifier used by the provider (required)
        name: Model Name         # Model name in Raycast (required)
        provider: provider_key    # Mapping to a specific API key (optional)
        description: Model description  # Model description (optional)
        context: 128000          # Context window size (required)

        # Model abilities (optional)
        # All properties within abilities are also optional
        abilities:
          temperature:
            supported: true
          vision:
            supported: true
          system_message:
            supported: true
          tools:
            supported: false
          reasoning_effort:
            supported: false
```

### Configuration Examples

#### Simple Provider with One Model

```yaml
providers:
  - id: my_provider
    name: My Provider
    base_url: https://api.example.com
    api_keys:
      default: MY_API_KEY
    models:
      - id: gpt-4
        name: GPT-4
        context: 128000
        abilities:
          temperature:
            supported: true
          vision:
            supported: true
```

#### Provider with Multiple Models and Different API Keys

```yaml
providers:
  - id: multi_provider
    name: Multi Provider
    base_url: https://api.example.com
    api_keys:
      openai: OPENAI_KEY
      anthropic: ANTHROPIC_KEY
    models:
      - id: gpt-4o
        name: GPT-4o
        provider: openai
        context: 200000
      - id: claude-sonnet
        name: Claude Sonnet
        provider: anthropic
        context: 200000
```

#### Provider Without API Keys

```yaml
providers:
  - id: local_provider
    name: Local Provider
    base_url: http://localhost:4000
    models:
      - id: local-model
        name: Local Model
        context: 128000
```

## Important Notes

1. **API Compatibility**: Since the OpenAI API is not a standard, not all providers may work correctly with Raycast AI. It's recommended to check your provider's documentation.

2. **Model Abilities**: If abilities are specified incorrectly, the model may not work correctly in Raycast AI. Always refer to the provider's documentation.

3. **YAML Format**: The extension **DOES NOT** preserve comments and formatting where possible, but when manually editing the file, ensure the YAML syntax is correct.


## License

MIT
