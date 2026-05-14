<!--
FIXTURE — lists
Input: dashed bullets, asterisk bullets, plus bullets, ordered lists, task lists, nested
Expected on Wrap: list markers preserved, hang indent on continuations
Expected on Unwrap: continuation lines merge into the parent item
-->

- A dash bullet that is long enough to wrap if width is small
- Another dash bullet
  with a continuation line

* Asterisk bullets
+ Plus bullets

1. First ordered
2. Second ordered
10) Tenth ordered with paren style

- [ ] An unchecked task
- [x] A checked task
- [X] Capital X also works

- Outer
  - Nested under outer
    - Deeper still
