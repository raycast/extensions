## Appendix A - Useful Development Tools

In this appendix, we talk about some useful development tools that the Cairo
project provides. We’ll look at automatic formatting, quick ways to apply
warning fixes, a linter, and integrating with IDEs.

### Automatic Formatting with `cairo-format`

The `cairo-format` tool reformats your code according to the community code style.
Many collaborative projects use `cairo-format` to prevent arguments about which
style to use when writing Cairo: everyone formats their code using the tool.

To format any Cairo project, enter the following:

```console
cairo-format -r
```

Running this command reformats all the Cairo code in the current directory, recursively. This
should only change the code style, not the code semantics.

### IDE Integration Using `cairo-language-server`

To help IDE integration, the Cairo community recommends using the
[`cairo-language-server`][cairo-language-server]<!-- ignore -->. This tool is a set of
compiler-centric utilities that speaks the [Language Server Protocol][lsp]<!--
ignore -->, which is a specification for IDEs and programming languages to
communicate with each other. Different clients can use `cairo-language-server`, such as
[the Cairo extension for Visual Studio Code][vscode-cairo].

[lsp]: http://langserver.org/
[vscode-cairo]: https://github.com/starkware-libs/cairo/tree/main/vscode-cairo

Visit the `vscode-cairo` [page][vscode-cairo]<!-- ignore -->
for installation instructions, You will gain abilities such as autocompletion, jump to
definition, and inline errors.

[cairo-language-server]: https://github.com/starkware-libs/cairo/tree/main/crates/cairo-lang-language-server
