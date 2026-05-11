<!--
FIXTURE — edge cases
Input: empty paragraphs, single blank lines, whitespace-only lines, no trailing newline, very long single-token line
Expected on Wrap/Unwrap: graceful handling, no crashes, no infinite loops
-->

   

A_single_extremely_long_token_with_no_spaces_that_definitely_exceeds_any_reasonable_wrap_width_limit_set_by_the_user

After the long token.
