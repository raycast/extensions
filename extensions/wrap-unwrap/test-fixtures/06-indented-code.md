<!--
FIXTURE — indented code
Input: 4-space indented code outside a list, 4-space indent inside a list (continuation)
Expected on Wrap: top-level indented code preserved; list continuations reflow
Expected on Unwrap: same — indented code stays put
-->

para before

    indented_code_line_one
    indented_code_line_two

para after

- list item
    continuation under the bullet (4 spaces)
- next item
