# Agent Fork setup

1. Run an Ollama-compatible endpoint and make at least one model available.
2. In Raycast extension preferences, configure the endpoint and default model.
3. Invoke `spawn_sub_agent` with a self-contained prompt and delegation reason.
4. Optionally provide JSON relationship, capability, lifecycle, or policy context and caller-owned hook URLs.

The result reports execution status, lineage identifiers, attempted models, elapsed time, observed output, hashes, and hook receipts. Agent Fork does not decide whether the caller's wider objective is complete; `doneVerified` remains `false` for caller-side verification.

If a request fails, verify endpoint reachability, model availability, timeout, hook response shape, and JSON input validity. Hooks must return a JSON decision of `allow`, `deny`, `accept`, or `reject`.
