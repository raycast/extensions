# Agent Fork architecture

Agent Fork provides agency primitives. It does not prescribe governance.

## Execution path

1. Validate tool inputs and caller-defined JSON metadata.
2. Construct a parent/child identity envelope and integrity hash.
3. If configured, call the caller-owned pre-dispatch hook and fail closed on denial, malformed responses, or unavailability.
4. Dispatch to the configured Ollama-compatible endpoint, using the explicit fallback model chain.
5. Capture observed output, timing, attempts, hashes, and acknowledgement state.
6. If configured, call the caller-owned post-result hook and preserve both its receipt and the observed child evidence.
7. Return a structured result with `doneVerified: false`.

## Boundaries

The extension does not define capability hierarchies, admission policy, completion criteria, repository identity, issue-tracker semantics, deployment rules, or authority expansion rules. JSON metadata and hook decisions are caller-owned. The extension validates structure and transport behavior only.

## Failure semantics

Malformed inputs and hook failures block before model dispatch when they occur at admission. Model and timeout failures are explicit and retain attempt evidence. Post-result rejection does not erase the child output or its provenance.
