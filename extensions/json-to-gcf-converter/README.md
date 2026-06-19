# JSON to GCF Converter

Convert JSON data into [GCF (Graph Compact Format)](https://gcformat.com) instantly.

GCF is an LLM-optimized wire format that reduces token usage by 53-71% compared to JSON, with 90.7% comprehension accuracy across frontier models (GPT-4o, GPT-5.5, Claude, Gemini). Verified lossless across 33 billion+ round-trips.

## Usage

1. Copy JSON to your clipboard (or select it in any app)
2. Run "Convert JSON to GCF" from Raycast
3. The GCF output is copied to your clipboard (or pasted directly)

## Preferences

- **Default Action**: Copy to clipboard or paste to active app
- **Input Source**: Auto-detect selected text, or always use clipboard

## Why GCF over JSON for LLM prompts?

- **53-71% fewer tokens**: Saves cost on every API call
- **90.7% comprehension accuracy**: LLMs read GCF more accurately than JSON (53.6%) or TOON (68.5%)
- **Lossless**: 33 billion+ verified round-trips, zero failures
- **Zero dependencies**: The GCF library has no runtime dependencies

## Links

- [GCF spec and docs](https://gcformat.com)
- [GCF TypeScript SDK](https://www.npmjs.com/package/@blackwell-systems/gcf)
- [Benchmarks](https://gcformat.com/guide/benchmarks)
