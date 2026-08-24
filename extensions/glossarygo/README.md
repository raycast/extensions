# GlossaryGo

GlossaryGo searches a private glossary stored in a local YAML file. Open **Search Term** in Raycast, type the start of
a term, and select a result to read or copy its complete definition.

## Setup

1. Create a UTF-8 file whose name ends in `.yaml` using the format below.
2. Open **Search Term** in Raycast.
3. When prompted, set the required **Glossary File** preference to that file. You can change it later in the
   extension preferences.

GlossaryGo supports macOS and Windows. The selected file must be readable, contain exactly one YAML document, and be
no larger than 5 MiB. The `.yml` extension is not supported.

## Glossary format

The document root must contain exactly one field named `terms`. Its value is a sequence of entries, and each entry
must contain exactly the two fields shown here:

```yaml
terms:
  - term: API
    definition: Application Programming Interface

  - term: ADR
    definition: |
      A short record of an architectural decision
      and the reasons behind it.
```

`term` and `definition` must both be non-empty strings. A term cannot have leading or trailing whitespace. Definitions
may span multiple lines, and their content is preserved when displayed and copied. An empty glossary is valid:

```yaml
terms: []
```

Do not add other root or entry fields. Duplicate terms are rejected using the same Unicode-normalized,
case-insensitive comparison as search. Anchors, aliases, merge keys, custom tags, and multiple YAML documents are not
supported. Ordinary mappings, sequences, comments, quoted strings, and literal or folded multiline strings are
supported.

## Searching and actions

Search matches term-name prefixes only. It trims the query, ignores case, preserves accent differences, and treats
canonically equivalent Unicode text as the same. For example, `a` matches `API`, while `e` does not match `éclair`.
Definitions are never searched.

Matches are sorted in case-insensitive, accent-sensitive, locale-aware ascending order. GlossaryGo displays at most
the first five results; when more exist, it reports `Showing 5 of N matches`. With an empty query, the first five terms
from the sorted glossary are shown.

Use the result actions to copy the complete definition or term without closing the command. Choose **Reload Glossary**
after editing the file to reread and revalidate it. GlossaryGo does not watch the file automatically, and a failed
reload shows an error instead of retaining stale results.

## Privacy

GlossaryGo reads only the glossary file you select. Glossary content stays on your device and is held in memory while
the command is open. It is not persisted, logged, sent over the network, or included in telemetry. Content leaves the
command only when you explicitly copy a term or definition to the clipboard.

## Troubleshooting

- **The file cannot be selected or loaded:** Confirm that it ends in `.yaml`, is readable, uses valid UTF-8, and is no
  larger than 5 MiB. Select a different file from the extension preferences if necessary.
- **The glossary is rejected:** Confirm that the file contains one YAML document with only the `terms` root field and
  that every entry has only a non-empty `term` and `definition`. Remove duplicate terms and unsupported YAML features
  such as anchors, aliases, merge keys, or custom tags.
- **No terms appear:** `terms: []` is a valid empty glossary. Otherwise, fix the validation error and choose **Reload
  Glossary**.
- **A search returns no matches:** Search uses the beginning of term names, not definitions or text in the middle of a
  term. Shorten or correct the prefix.
- **Recent edits do not appear:** Choose **Reload Glossary** from the action panel. File changes are not loaded
  automatically.
