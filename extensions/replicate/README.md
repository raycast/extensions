# Replicate

Run Replicate's AI models from Raycast.

## Setup

1. Create an API token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).
2. Paste it into the extension's API Token preference.
3. Using Replicate models in Raycast AI needs Raycast Pro.

## Use cases

- **Chat with a Replicate model.** Pick an image, editing or text model in Raycast AI's model picker. Image models reply with the image, and "make it bluer" edits the last one.
- **Make images from any chat.** Ask any model: `@replicate draw a fox in watercolor`.
- **Run any model directly.** Open Run a Model, pick a model and fill in its inputs.

## Tools

`@replicate` gives Raycast AI these tools:

- **List Image Models**: the image models in your picker, and your default.
- **Search Models**: finds image models across Replicate, and asks before running one outside your picker.
- **Describe Model**: a model's inputs, like seed or output format.
- **Start Image Generation**: runs a model, and returns the image if it's done within 5 seconds.
- **Check Image Generation**: waits for a slower run to finish.
