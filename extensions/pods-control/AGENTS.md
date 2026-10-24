# Agent instructions

## Glossary

[GLOSSARY.md](GLOSSARY.md) defines the project's terms. Use them in everything you write: replies to the user, code, comments, user-facing copy, docs, commits, and pull requests. Do not use the words a term lists under _Avoid_.

- When the user uses a word that conflicts with the glossary, say so and ask which meaning they intend.
- When a word is vague or has more than one meaning, propose a precise term.
- When the user describes how something works, check that the code agrees, and raise any contradiction.
- When a term is agreed, update `GLOSSARY.md` right away. An entry has a short definition and the words to avoid. Keep implementation details out.

## Other docs

Read these before changing the matching area:

- [ARCHITECTURE.md](ARCHITECTURE.md): where code lives, dependency rules, and behavior contracts.
- [TESTING.md](TESTING.md): test conventions and the commands to run before you finish.
- [CONTRIBUTING.md](CONTRIBUTING.md): whether a change belongs in this extension or in the pods-control CLI.
- [README.md](README.md): what users read. Keep it in sync with user-facing changes.
