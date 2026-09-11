<!--
FIXTURE — prose paragraphs
Input: three paragraphs of unwrapped prose separated by blank lines
Expected on Wrap (width=40): each paragraph wraps at 40 cols, blank lines preserved
Expected on Unwrap: paragraphs stay separate; lines within each paragraph join into one
-->

The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.

A second paragraph that should remain distinct. It also has multiple sentences and should reflow as one logical line.

A third paragraph for good measure.
