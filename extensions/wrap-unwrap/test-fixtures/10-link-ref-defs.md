<!--
FIXTURE — reference link definitions
Input: prose using ref links plus a defs block at the bottom
Expected on Wrap: each definition stays on its own line; prose reflows
Expected on Unwrap: definitions stay on their own lines; prose paragraphs join
-->

This is a paragraph that uses [a ref link][one] and [another][two] for context.

[one]: https://example.com/one
[two]: https://example.com/two "with a title"
