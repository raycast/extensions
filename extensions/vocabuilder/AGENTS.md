# Security Guardrails for AI Edits

- Never place secrets (API keys, tokens, passwords) in URLs or query parameters. Send them in headers or request bodies.
- Treat all model output and user input as untrusted. Escape or sanitize before rendering in Markdown/HTML/UI-rich fields.
- Never expose raw upstream errors, parser internals, or validation traces to users. Map failures to stable user-safe messages.
- Never interpolate raw user input into LLM prompts. First enforce strict length/shape validation and embed values as encoded literals (for example with `JSON.stringify`) instead of quoted string concatenation.
- Before finishing changes, run a quick security check for secret exposure, injection surfaces, and sensitive error leakage.
