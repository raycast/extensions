# OpenAI Image and Text Generator

The OpenAI Generator extension uses the OpenAI [Image Generation](https://beta.openai.com/docs/guides/images) API — colloquially known as [DALL·E 2](https://openai.com/dall-e-2/) — and the [Text Completion](https://beta.openai.com/docs/guides/completion) API to generate results from a text-based prompt.

## Usage

This extension provides 4 commands:

1. **Complete Text** - uses the GPT-3 AI models to generate a text completion that attempts to match whatever context or pattern you gave it
2. **Create Image** - uses the DALL•E AI model to generate new images
3. **Create Image Variation** - uses the DALL•E AI model to create a variation on an image you upload from your local disk
3. **Create Image Edit** - uses the DALL•E AI model to extend an image you upload using a mask

## API Keys

In order to use OpenAI's APIs, you have to create an account and create [a new API key](https://beta.openai.com/account/api-keys). Once you have a key, paste it into the extension's settings.

Please make sure to [familiarize yourself](https://beta.openai.com/docs/guides/images/introduction) with the API's limits. While it's super fun to just start immediately generating images, the Create Image API is heavily rate-limited (you'll be limited to 10 images per minute, and 25 per 5 minutes) and even the Text Completion API can run up a bill if you push it hard enough.

When you create a free account, you're granted $18 worth of credits for 12 months. Once you blow through your free credits, you'll be blocked from making more requests until you enter billing information.

## [Pricing](https://openai.com/api/pricing/)

The DALL·E Create Image API is priced based on image dimensions:

| Size       | Price          |
| ---------- | -------------- |
| 1024×1024  | $0.020 / image |
| 512×512    | $0.018 / image |
| 256×256    | $0.016 / image |

The [GPT-3](https://beta.openai.com/docs/models/gpt-3) Text Completion API is priced based on [token](https://beta.openai.com/tokenizer) usage:

| AI Model                | Price
| ----------------------- | -------------------- |
| Ada (Fastest)           | $0.0004  / 1K tokens |
| Babbage                 | $0.0005  / 1K tokens |
| Curie                   | $0.0020  / 1K tokens |
| Davinci (Most powerful) | $0.0200  / 1K tokens |
