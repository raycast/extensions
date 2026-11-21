# Random Data Generator

Generate random data (names, addresses, numbers, dates, …) using the [Faker](https://fakerjs.dev) library, in any of Faker's locales.

## Usage

Run **Generate Random Data**, pick an entry and copy it or paste it into the active app. Pin entries you use often, and create quicklinks to copy or paste a specific kind of data straight from the root search.

## Custom Items

Built-in entries call a single Faker method with no arguments. Custom items let you define your own generators with a Faker template:

| Template | Example output |
| --- | --- |
| `{{number.int({"min":5,"max":10})}}` | `7` |
| `{{person.firstName}} {{person.lastName}} <{{internet.email}}>` | `Ada Lovelace <ada@example.com>` |
| `{{helpers.arrayElement(["red","green","blue"])}}` | `green` |
| `{{commerce.price({"min":10,"max":100,"dec":2})}}` | `44.69` |

A tag is `{{module.method}}` and may pass one argument in parentheses. The argument must be strict JSON (double-quoted keys and strings). Literal text can surround tags, and several tags can be combined.

Press `⌘N` on any entry (or select **Create Custom Item…**) to open the form. Describe what you want, for example "integer between 5 and 10", and press `⌘⇧G` to let Raycast AI write the template for you (requires Raycast AI). The form previews the generated value so you can adjust the template before saving.

Custom items support the same actions as built-in ones: copy, paste, pin, refresh and quicklinks. Use `⌘E` to edit and `⌃X` to delete a custom item.
