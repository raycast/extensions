---
name: recipe-topic-timeline
description: >-
  Build a chronological narrative for a topic by interleaving meeting transcript
  excerpts and email thread summaries across a time range.
metadata:
  version: 1.0.0
  requires:
    skills:
      - use-spark
    accessLevel: read-only
---

# Recipe: Topic Timeline

For a given project or topic, build a unified chronological narrative by interleaving meeting discussions and email threads. Useful for catching up, briefing someone new, or preparing a status update.

**Prerequisite:** Read the `use-spark` base skill for tool reference and filter syntax.

**Access level required:** read-only.

## Steps

### Step 1: Define the scope

Ask the user for:
- The **topic or project name** (keywords to search on)
- The **time range** (default to 30 days if unspecified)

### Step 2: Gather meeting data

```
meetings { "filter": "subject:topic-keyword newer_than:30d" }
```

If the subject filter misses relevant meetings, broaden:

```
meetings { "filter": "newer_than:30d" }
```

For each relevant meeting, read the summary:

```
meeting { "meeting_id": "<id>" }
```

Pull full detail only for meetings where the topic was a major agenda item:

```
meeting { "meeting_id": "<id>", "transcript": true, "notes": true }
```

Record: date, participants, and the key points related to the topic.

### Step 3: Gather email data

```
search { "query": "topic keyword" }
```

For threads that are clearly relevant, read the full conversation:

```
thread { "message_id": "<id>" }
```

If there are specific people associated with the topic, also pull their threads:

```
emails { "filter": "from:person@co.com subject:keyword newer_than:30d" }
```

Record: date of each message, participants, and the substance.

### Step 4: Merge into a timeline

Combine all entries (meetings and emails) and sort by date. For each entry:

- **Date**
- **Channel:** Meeting / Email
- **Participants**
- **What happened:** one or two sentences summarizing the key substance

### Step 5: Annotate the timeline

Layer on editorial notes:
- Mark **turning points** where direction changed
- Flag **open threads** that don't have a resolution
- Note **gaps** — periods with no activity that might indicate stalled progress

### Step 6: Present the timeline

Start with a one-paragraph executive summary of where the topic stands now, then present the full timeline oldest-to-newest. End with:
- **Current status:** the latest known state
- **Open items:** anything still unresolved
- **Next touchpoint:** upcoming meeting or pending email that will advance the topic

## Tips

- `search` is relevance-ranked and returns full bodies — it's the best starting point for email discovery.
- Meeting summaries usually capture the topic well enough. Reserve `meeting`'s `transcript` for meetings where you need exact quotes or attribution.
- For topics that span many months, work in chunks (e.g., month by month) to avoid overwhelming the output.
- This pairs well with `recipe-decision-tracker` — use that recipe when you only need the decision points, and this one when you need the full narrative.
- If building this for someone else (e.g., onboarding a new team member), call out any assumed context that an outsider wouldn't have.
