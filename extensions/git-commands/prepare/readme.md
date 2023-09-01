# Git Commands - Prepare Dev Notes

This is a help file for preparing the extension in development mode. It is not necessary for the use of the extension but it can be useful for other developers who want to collaborate or do something similar.

## Requirements

### Oh My Zsh

Make sure we have Oh My Zsh installed and that we have the git plugin activated. Which is in charge of creating the aliases.

## Get the alias list

In the terminal, go to this folder and run the following command:

```bash
alias | grep "git" | grep -E "^(g|\'g)" > alias.txt
```

It will create a file named `alias.txt` with all the aliases that start with `g` or `'g` (the quotes are there because some aliases are defined with quotes).

### Parse to JSON

Run the node scripts into the parse.mjs file:

```bash
node parse.mjs
```

It will create a file named `alias.json` with all the aliases in JSON format in the `src` folder.
