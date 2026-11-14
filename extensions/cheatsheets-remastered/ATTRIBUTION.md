# Attribution

The extension software is by **Sam McNab (`smcnab1`)**, under [MIT](LICENSE).

## Bundled references

The references originate from [DevHints](https://devhints.io/) / [Rico Sta. Cruz and contributors](https://github.com/rstacruz/cheatsheets). Their historical MIT notice is retained verbatim in [DEVHINTS-LICENSE.txt](assets/DEVHINTS-LICENSE.txt). Individual source links and author notices remain intact.

The extension's [original import](https://github.com/raycast/extensions/commit/0abf19dbd937a73b3db0777458bd87885c2038fa) and [metadata/index update](https://github.com/raycast/extensions/commit/1c7042cadf638b78345215bc0502a8fec0504714) explain the bundled derivation. Upstream [added MIT in 2021](https://github.com/rstacruz/cheatsheets/commit/918aa48327b724847b3e89723724bfa7f8a51f7f) and [removed the root license in 2024](https://github.com/rstacruz/cheatsheets/commit/44bdd413fb5069e85d1541f3ecf752d80aef224a). Historical permission does not automatically cover later additions.

## Restored editions

These six references use the exact source revision **`bf059536c6403deadd404b25320df2dc4608537d`**, dated 28 March 2024, with the limited local corrections below. The [MIT license at that same revision](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/LICENSE) is byte-identical to the packaged historical notice. These are licensed derivatives, not claims of byte-identical current upstream content.

| Reference and immutable source                                                                                           | Local correction                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [bash.md](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/bash.md)                 | Add a Bash-version caveat; correct conditional/glob descriptions and line-array reading.                       |
| [jsdoc.md](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/jsdoc.md)               | Use a JSDoc comment for the alias/name example.                                                                |
| [markdown.md](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/markdown.md)         | No body changes.                                                                                               |
| [python.md](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/python.md)             | Correct Python 3 unpacking/zip/f-string guidance and file-reading/indentation examples; use the Python 3 link. |
| [tar.md](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/tar.md)                   | Append to an uncompressed archive with the file argument; explain the compressed-archive limitation.           |
| [vim-digraphs.md](https://github.com/rstacruz/cheatsheets/blob/bf059536c6403deadd404b25320df2dc4608537d/vim-digraphs.md) | Add Markdown table header separators so symbol tables render correctly.                                        |

The accuracy checks used the [Python 3 reference](https://docs.python.org/3/library/functions.html), [GNU tar append documentation](https://www.gnu.org/software/tar/manual/html_node/append.html), [Bash manual](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html) and [JSDoc alias documentation](https://jsdoc.app/tags-alias.html). They are targeted corrections, not a claim that every historical example has been revalidated against every current tool version.

`basic.md`, `keywords_test.md`, `packs.md` and `polyfill.io.md` are excluded from this release and its index because applicable permission evidence for their later material was not located. Missing evidence is not proof that no permission exists. An obsolete external `cdn.polyfill.io` loader was also removed from the styling example in `cheatsheet-styles.md`; no replacement loader is added.

## Other contribution evidence

MIT-bearing contribution heads support the later bundled changes in [lua](https://github.com/rstacruz/cheatsheets/tree/3f3012137e12e4cd7686e654fb0178911cd0d97d), [pm2](https://github.com/rstacruz/cheatsheets/tree/9bfe149d2d0ba453d28254f01f15dfa7ff061136), [rspec](https://github.com/rstacruz/cheatsheets/tree/0c3d728996a6733ceafd640185b5003a69c67f89) and [tmux](https://github.com/rstacruz/cheatsheets/tree/25739d317e9a9bc8ef59badfdce28ec1b5c63a28). Each head retains the same root MIT notice; the rspec change is applied to the historical licensed base.

## Distributed notices

- [Bundled content notice](assets/BUNDLED-CONTENT-NOTICE.txt): source and modification boundaries.
- [Software notices](assets/THIRD-PARTY-NOTICES.txt): original licenses for the extension and redistributed dependencies.
