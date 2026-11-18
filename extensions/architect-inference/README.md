# Architect Inference

Use Architect Inference models in Raycast AI Chat, Quick AI, and AI Commands.
Architect Inference compares provider offers for each request and charges for the tokens used.
You need Raycast Pro and an Architect Inference account with available credits.

## Setup

1. Use Raycast 2.5 or later with a Raycast Pro plan.
2. Sign in at [Architect Inference](https://inference.ai.exchange).
3. Open **API keys** and create a buyer API key.
4. Check your workspace balance on the **Credits** page.
5. Install this extension.
6. Select Architect Inference in Raycast's model picker and allow its models.
7. Enter your Architect Inference API key when Raycast requests it.
8. Select **Auto** or a specific model.

You can also enable **Allow AI Models** in the extension preferences.
Raycast periodically refreshes the model list.
The list includes your workspace's chat presets and the available chat collections.
A model can become unavailable if its providers withdraw their offers.

Architect Inference charges your workspace for requests. Raycast Pro does not pay for Architect Inference usage.
Use a key with a spend limit if you need a budget.

## Capabilities

The extension reads the model list and context limits from Architect Inference's API.
It enables tools and image attachments only when the catalog declares those capabilities.
It sends text, images, and tool results through Architect Inference's Chat Completions endpoint.
It returns text, reasoning, and tool-call events as they arrive.
Raycast executes tools and sends their results on the next turn.

Raycast cannot return signed reasoning blocks on later turns.
Tool conversations that require those blocks are unsupported, including Claude presets with extended reasoning enabled.
Use a preset with extended reasoning disabled for those tool conversations.

The catalog does not state the accepted reasoning effort levels for each model.
The extension therefore leaves that control unset and uses each model's default.
It does not expose image, video, speech, transcription, embedding, or decision models.
Other extensions cannot select these models through `AI.ask`.

## Data and session affinity

Raycast stores the API key in a password preference.
The extension sends prompts, conversation history, attachments, and tool results to Architect Inference.
Architect Inference sends the request to the provider selected by the exchange.

The extension derives a session key from Raycast's conversation ID and your Architect Inference API key with HMAC-SHA256.
It sends this digest as `x-session-id`. It does not send the raw Raycast conversation ID, locale, or date fields.
Turns in one conversation use the same digest. A different API key produces a different digest.
A key change resets this affinity.

The digest lets Architect Inference apply its existing cache-affinity rules. It does not prove a cache hit or guarantee a discount.
The extension adds no analytics and stores no conversation history of its own.
Automatic request retries are off because another request can create another paid job.

See [Architect Inference prompt cache documentation](https://liquidinference.ai/docs/caching) for cache behavior and buyer isolation.
