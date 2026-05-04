<!--
FIXTURE — fenced code blocks
Input: backtick fences and tilde fences with content that LOOKS like prose/lists/tables
Expected on Wrap: every line inside a fence is preserved verbatim, even when long
Expected on Unwrap: nothing inside a fence is reflowed
-->

intro paragraph

```js
function thisIsAVeryLongFunctionNameThatShouldNotBeWrappedNoMatterWhat() {
  return "stay put";
}
```

between fences

~~~
- this looks like a list but is inside a fence
1. and so is this
| not | a | table |
~~~

after
