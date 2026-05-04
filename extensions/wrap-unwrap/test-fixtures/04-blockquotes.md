<!--
FIXTURE — blockquotes
Input: single-level, nested, quote-with-list, quote-with-code
Expected on Wrap: quote markers preserved on every output line; width includes them
Expected on Unwrap: lines within the same quote depth merge; depth changes break groups
-->

> A single-level quote that should reflow when wrapped or unwrapped.
> Continues here.

> Outer quote
> > Nested quote with its own paragraph
> > continuing here.

> - A bullet inside a quote
>   with a continuation line
> - A second bullet

> ```
> code inside a quote
> stays put
> ```
