# Prompt Design Guide

The executable prompts live in `src/prompts.ts`. This document defines their intended behavior.

Do not copy prompt text into this file as a second source of truth. Update the code and use this document for principles and evaluation.

## Core objective

Transform Chinese input into English that sounds natural on X while preserving the user's intended meaning, confidence level, and factual claims.

TweetCraft is a rewriting tool, not a fact generator.

## Global prompt requirements

Every mode should:

- preserve the central meaning,
- preserve names, numbers, and technical terms,
- preserve uncertainty and qualification,
- avoid inventing facts or examples,
- avoid explaining the translation,
- output only the requested post text,
- avoid quotation marks around the entire result unless the user used them intentionally,
- avoid hashtags and emojis unless they fit the source or mode,
- prefer idiomatic English over word-for-word translation,
- avoid generic AI filler,
- remain concise enough for X.

## Natural mode

Purpose:

Produce the most broadly useful native-English version.

Traits:

- clear,
- conversational,
- idiomatic,
- faithful,
- not overly dramatic,
- no unnecessary jargon.

Avoid:

- literal Chinese sentence structure,
- formal essay tone,
- excessive em dashes,
- adding a hook that changes the claim.

## Punchy mode

Purpose:

Make the thought sharper and more memorable without changing its substance.

Traits:

- stronger rhythm,
- tighter clauses,
- confident wording when the source is confident,
- suitable line breaks when they improve readability.

Avoid:

- fake certainty,
- clickbait,
- invented contrast,
- turning every thought into a slogan.

## Short mode

Purpose:

Compress the thought to its smallest natural English form.

Traits:

- minimal,
- direct,
- no duplicated idea,
- preserve the key claim.

Avoid:

- removing an essential caveat,
- fragments that become ambiguous,
- telegraphic wording that no native speaker would use.

## Reply mode

Purpose:

Write natural English for replying to another post or person.

Traits:

- conversational,
- context-aware in tone,
- less like a standalone announcement,
- respectful unless the Chinese source clearly indicates otherwise.

Avoid:

- adding a greeting automatically,
- sounding like customer support,
- repeating the entire context unnecessarily.

## Future mode guidance

New modes should be defined by observable writing traits, not imitation of a named living author.

Good mode descriptions:

- concise founder perspective,
- conversational technical explanation,
- calm contrarian take,
- minimal product update.

Avoid instructions such as “write exactly like [living person].”

## Meaning-preservation checklist

Before accepting a prompt change, evaluate whether output preserves:

- who is making the claim,
- what happened,
- when it happened,
- degree of certainty,
- praise or criticism,
- causal relationships,
- technical distinctions,
- conditional language.

## Suggested evaluation set

Maintain a small set of Chinese examples covering:

1. simple observation,
2. technical claim,
3. uncertain prediction,
4. criticism,
5. reply to another person,
6. sentence with product names,
7. sentence with numbers,
8. long idea requiring restructuring,
9. text already containing English terms,
10. input that should remain understated.

For each example, assess:

- fidelity,
- naturalness,
- concision,
- mode differentiation,
- hallucination risk.

## Example

Source:

```text
今天越来越觉得 AI 产品真正竞争的是工作流。
```

Natural:

```text
I'm increasingly convinced that AI products compete on workflow, not just models.
```

Punchy:

```text
AI products aren't just competing on models anymore. They're competing on workflow.
```

Short:

```text
AI products increasingly compete on workflow.
```

These are illustrative, not golden outputs. A rewrite must not introduce claims that were absent from the source.
