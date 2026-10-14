# Modelflare

Ask any text model and generate images in Raycast with one Modelflare **Smart API Key** for every model available to your account — GPT, Claude, Gemini, and image models such as GPT Image and Seedream.

## Get a Smart API Key

1. Sign up: https://modelflare.dev/sign-up?utm_source=raycast&utm_medium=plugin&utm_campaign=integrations
2. Console → API Keys → **Create Smart API Key**, and pick a routing strategy (Balanced / Stability first / Low price first).

## Setup

Open the extension preferences and paste your Smart API Key. Choose the China base URL (`https://origin.modelflare.dev/v1`) if you are in mainland China; the default is `https://modelflare.dev/v1`.

## Commands

- **Ask Modelflare** — pick any text model your key can call and stream the answer.
- **Generate Image** — pick an image model, write a prompt and optional model parameters (JSON, from the model's page at https://docs.modelflare.dev/models/image/). Images are saved to `~/Downloads/Modelflare`.

The model lists come from your key's `GET /v1/models`, so new models appear without editing the key. Calls are billed to your Modelflare balance by actual usage; see https://modelflare.dev/usage-logs.

## Troubleshooting

- **401**: the key is missing or invalid. Create a Smart API Key at https://modelflare.dev/keys.
- **`model_not_found`**: a regular key only calls the models of its own group. A Smart API Key calls every model available to your account.
- **403 `insufficient_user_quota`**: top up at https://modelflare.dev/billing.
