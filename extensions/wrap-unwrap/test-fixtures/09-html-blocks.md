<!--
FIXTURE — HTML blocks and comments
Input: a div block, an inline comment
Expected on Wrap: HTML block lines preserved; surrounding prose reflows
Expected on Unwrap: same
-->

before paragraph

<div>
hello inside a div
</div>

<!-- a comment -->

after paragraph
