<!--
FIXTURE — inline code and links
Input: prose containing code spans, inline links, ref links, autolinks
Expected on Wrap (width=40): inline tokens never split across lines, even when oversized
Expected on Unwrap: tokens stay intact across joins
-->

See `function_with_long_name` for details. Also visit [the documentation](https://example.com/very/long/path) for more.

A reference link [like this][ref] and an autolink <https://example.com/something>.

[ref]: https://example.com/ref
