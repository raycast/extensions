# ai-gen: OpenAI Image Generator

The `ai-gen` extension uses the OpenAI [Create Image API](https://beta.openai.com/docs/api-reference/images/create) — colloquially known as [DALL-E 2](https://openai.com/dall-e-2/) — to generate images from a text-based prompt description.

## API Keys

In order to use OpenAI's APIs, you have to create an account and create [a new API key](https://beta.openai.com/account/api-keys). Once you have a key, paste it into the extenion's settings.

Please make sure to [familiarize yourself](https://beta.openai.com/docs/guides/images/introduction) with the API's limits. While it's super fun to just start immediately generating images, the Create Image API is heavily rate-limited. You'll be limited to 10 images per minute, and 25 per 5 minutes.

When you create a free account, you're granted $18 worth of credits for 12 months. Once you blow through your free credits, you'll be blocked from making more requests until you enter billing information.

## Pricing

DALL-E API image generation is [priced](https://openai.com/api/pricing/) at the following rates:

| Size       | Price          |
| ---------- | -------------- |
| 1024×1024  | $0.020 / image |
| 512×512    | $0.018 / image |
| 256×256    | $0.016 / image |
