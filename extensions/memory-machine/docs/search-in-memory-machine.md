# Search in Memory Machine

Memory Machine's search lets you find anything that has ever been on your screen. At its simplest, just type a word or phrase. But if you want more control, there are a handful of powerful techniques available.

---

## Basic search

Simply type one or more words. When you provide multiple words without any operators between them, Memory Machine looks for screen captures that contain **all** of the words (implicit AND).

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

You don't need to worry about most special characters. Memory Machine automatically handles things like apostrophes, email addresses, file paths, and domain names.

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
| `app:"Microsoft Teams"`          | `app:Microsoft Teams`          | Quote app names that contain spaces                 |
| `AND`, `OR`, `NOT`               | `&&`, `\|\|`, `!`              | Boolean words are the documented operators          |
| `(invoice OR receipt) NOT draft` | `invoice OR receipt NOT draft` | Parentheses make intent explicit                    |
| `"design review"`                | `/design\s+review/`            | Regex syntax is not part of documented query syntax |

---

## App filters

Use `app:` to search by app name. Put names with spaces in double quotes.

```
meeting notes app:Notion
app:"Microsoft Teams"
```

The first query finds captures containing both words in Notion. The second shows captures from Microsoft Teams. You can use an app filter on its own, such as `app:Slack`.

Group app names with `OR` to include captures from any of those apps.

```
standup app:(Slack OR "Microsoft Teams")
invoice* app:(Chrome OR Safari)
```

Group keyword alternatives too when the same app filter should apply to each one.

```
(invoice OR receipt) app:Chrome
```

## Search fields

These qualifiers limit a word or phrase to a specific part of a capture.

| Qualifier | What it searches | Example                 |
| --------- | ---------------- | ----------------------- |
| `text:`   | Recognized text  | `text:project`          |
| `title:`  | Window title     | `title:"Meeting Notes"` |
| `site:`   | Website          | `site:apple.com`        |
| `url:`    | Page URL         | `url:apple.com/iphone`  |

Combine qualifiers with keywords, phrases, and Boolean operators.

```
"pull request" AND review app:("GitHub Desktop" OR Arc)
text:invoice site:example.com
```
