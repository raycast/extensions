# Concepts

Shared domain vocabulary for this extension — the words that carry a specific meaning here, so `AGENTS.md` and the code comments can use them without redefining them. Glossary only, not a spec.

## Conversation

### Conversation
A titled thread of question-and-answer turns sent to one model, persisted so it can be reopened and continued later. The unit users pin, archive, rename, and delete.

A Conversation is assembled from two sources with different authority: fields the user sets while browsing (its title, whether it is archived) belong to it alone, while its turns and timestamps can be re-derived from older storage. Adding a field means deciding which side owns it — a field owned by browsing that gets treated as re-derivable will silently revert.

### Turn
One question and the answer it produced, together with which model or preset answered. Turns are ordered oldest-first within a Conversation; a Conversation with no turns is legitimate and must survive, since it represents a question asked but not yet answered.
*Avoid:* Chat, message

A turn records the model that answered it rather than inheriting the Conversation's current model, so two identical questions answered by different models remain distinguishable after the fact.

### Recents
The single surface listing every Conversation, filterable by whether it is active or archived. Replaced three earlier surfaces that were separate views over the same underlying data.

## Configuration

### Preset
A saved pairing of a model with a system prompt and generation limits, selectable when asking a question. A Preset is not a model — it names a model plus the instructions and ceilings applied to it.
*Avoid:* Custom model

### Model
A specific Claude model available to the account, fetched live rather than hardcoded, so newly released models appear without a release. Distinct from a Preset, which wraps one.

## Storage

### Retirement
The step where older storage keys are deleted after their contents have been migrated into current storage and that migration has been verified. Until retirement completes, the older keys remain the fallback; afterwards they are gone and the new storage is the only source.

Each retirement is irreversible for the keys it deletes, which is why verification precedes deletion rather than following it, and why content that cannot be read is preserved rather than discarded. Retirement is nonetheless repeatable: an older build still writing to the retired keys is folded in and retired again on the next pass, so it converges rather than latching once.

### Write admission
The rule deciding whether a record new to storage may be written at all. Distinct from deletion: a rule that legitimately blocks a new record from being stored must never remove a record already there, since the same predicate can be true of a new record and false of an old one that predates the rule.

## Flagged ambiguities

- **Model** had been used for both a Claude model and a saved Preset — these are distinct. User-facing surfaces say Preset; the underlying type is still named `Model` for historical reasons.
- **Chat** had been used for both a single turn and a whole Conversation — a turn is the narrower one, and Conversation is the unit users act on.
