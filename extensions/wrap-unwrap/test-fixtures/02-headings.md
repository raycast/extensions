<!--
FIXTURE — ATX and setext headings
Input: ATX h1-h3, setext h1 and h2, with prose between
Expected on Wrap: headings stay on their own line; only prose reflows
Expected on Unwrap: headings stay on their own line; prose paragraphs collapse to one line each
-->

# An ATX heading

Some prose under the heading that may need to be reflowed depending on width.

## Another ATX heading

A Setext H1
===========

Body of setext h1.

A Setext H2
-----------

Body of setext h2.
