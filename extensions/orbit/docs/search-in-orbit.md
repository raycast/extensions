# Search in Orbit

Orbit's search lets you find anything that has ever been on your screen. At its simplest, just type a word or phrase. But if you want more control, there are a handful of powerful techniques available.

---

## Basic search

Simply type one or more words. When you provide multiple words without any operators between them, Orbit looks for screen captures that contain **all** of the words (implicit AND).

```
quarterly review
```

→ Finds screen captures containing both "quarterly" **and** "review".

---

## Exact phrase search

Wrap your query in **double quotes** to search for an exact sequence of words. Just like Google.

```
"design review"
```

→ Only matches screen captures where those two words appear side by side in that exact order.

---

## Boolean operators

You can combine terms using `AND`, `OR`, and `NOT`. Operators are **not** case-sensitive: `and`, `OR`, `And` all work the same way.

| Operator | What it does                              | Example                 |
| -------- | ----------------------------------------- | ----------------------- |
| `AND`    | Both terms must be present                | `apple AND orange`      |
| `OR`     | Either term (or both) must be present     | `invoice OR receipt`    |
| `NOT`    | First term present, second must be absent | `database NOT postgres` |

**Examples**

```
Figma OR Sketch
meeting AND agenda NOT cancelled
```

---

## Wildcard / prefix search

Add a `*` to the **end** of a word to match anything that starts with those letters.

```
app*
```

→ Matches "app", "apple", "application", "approval", etc.

```
dev* AND (tools OR testing)
```

→ Matches screen captures about developer tools or developer testing.

> **Note:** The `*` only works at the end of a word, not at the beginning or in the middle.

---

## Grouping with parentheses

Use parentheses to control how operators are evaluated. This is useful for building more precise queries.

```
(apple OR cherry) AND pie
```

→ Finds screen captures that mention pie, along with either apple or cherry.

```
(invoice OR receipt) NOT draft
```

→ Finds invoices or receipts, but excludes anything marked as a draft.

---

## Special characters

You don't need to worry about most special characters. Orbit automatically handles things like apostrophes, email addresses, file paths, and domain names.

```
John's notes
test@example.com
github.com
src/utils
```

All of these work as expected without any extra quoting.

---

## Quick reference

| Syntax           | Description             | Example                      |
| ---------------- | ----------------------- | ---------------------------- |
| `word`           | Single word search      | `invoice`                    |
| `word1 word2`    | Both words must appear  | `design review`              |
| `"exact phrase"` | Exact sequence of words | `"Q1 results"`               |
| `word*`          | Prefix / wildcard match | `app*`                       |
| `A AND B`        | Both A and B            | `apple AND orange`           |
| `A OR B`         | Either A or B           | `Figma OR Sketch`            |
| `A NOT B`        | A but not B             | `meeting NOT cancelled`      |
| `(A OR B) AND C` | Grouped logic           | `(design OR dev) AND review` |

---

## Supported vs avoid patterns

When constructing queries, stay within documented syntax.

| Prefer                           | Avoid                          | Why                                                 |
| -------------------------------- | ------------------------------ | --------------------------------------------------- |
| `invoice*`                       | `*invoice` or `in*voice`       | `*` is only documented as a suffix wildcard         |
| `@"Microsoft Teams"`             | `@Microsoft Teams`             | Multi-word app names should be quoted               |
| `AND`, `OR`, `NOT`               | `&&`, `\|\|`, `!`              | Boolean words are the documented operators          |
| `(invoice OR receipt) NOT draft` | `invoice OR receipt NOT draft` | Parentheses make intent explicit                    |
| `"design review"`                | `/design\s+review/`            | Regex syntax is not part of documented query syntax |

---

## App filters

You can narrow any search down to one or more specific apps by adding an `@` token anywhere in your query. This is useful when you know where you were working but want to cut out everything else.

### Syntax

| App name       | Token to use  | Example              |
| -------------- | ------------- | -------------------- |
| Single word    | `@AppName`    | `@Slack`             |
| Multiple words | `@"App Name"` | `@"Microsoft Teams"` |

The `@` token can appear **anywhere** in your query — at the start, the end, or in the middle. Orbit strips it out before running the text search, so it never interferes with your keywords.

### Filter by a single app

```
meeting notes @Notion
```

→ Finds screen captures containing "meeting notes" that were captured in Notion.

```
@Slack
```

→ Shows all screen captures from Slack, with no text filter applied.

### Filter by multiple apps

You can add more than one `@` token. Multiple app filters are treated as **OR:** results from any of the specified apps will be included.

```
standup @Slack @"Microsoft Teams"
```

→ Finds screen captures containing "standup" captured in either Slack or Microsoft Teams.

```
@Figma @"Adobe XD"
```

→ Shows all screen captures from either Figma or Adobe XD.

### Combining app filters with other search techniques

App filters work alongside all other search syntax : boolean operators, exact phrases, wildcards, and grouping all still apply to the text part of your query.

```
"pull request" AND review @"GitHub Desktop" @Arc
```

→ Finds screen captures with the exact phrase "pull request" and the word "review", captured in either GitHub Desktop or Arc.

```
invoice* @Chrome @Safari
```

→ Finds screen captures where any word starting with "invoice" appeared in Chrome or Safari.

### Unrecognised app names

App names are matched against the apps installed on your Mac (case-insensitive). If Orbit can't find an exact match for an `@` token, it will let you know and suggest the closest installed app it found. So `@Slakc` might prompt you with a suggestion of `@Slack`.

### Tips

- App names are **not** case-sensitive: `@slack` and `@Slack` are treated the same way.
- If an app name contains spaces, always wrap it in double quotes: `@"Microsoft Teams"`, not `@Microsoft Teams`.
- You can use an app filter **without** any keywords to browse everything captured in that app.
- Multiple `@` tokens expand your results (OR), while adding more keywords narrows them (AND). Combine both to zero in precisely.
