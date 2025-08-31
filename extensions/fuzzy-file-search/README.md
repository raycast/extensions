# Fzf File Search

Search for files using their full-paths and fuzzy find algorithm.

For example:
TODO: insert photo of a search

It is meant as a replacement for builtin "Search Files".
Raycast's builtin extension "Search Files" only searches for the filename which is not ideal when organizing files using directories.
Imagine the following scenario:

```
~/
    algorithms/
        homework.pdf
    data-structures/
        homework.pdf
```

Using Raycast's builtin "Search Files" you can look for `homework.pdf` but you will get both results.
Using Fzf File Search you can search for `algo homework` and get directly find `~/algorithms/homework.pdf`.
This functionality is very helpful for highly structured data in deep nested directories.

Raycast's "Search Files" allows to specify in which directory the file is supposed to be e.g., `homework in ~/algorithms/`
This approach requires the user to know exactly in which directory to look for and provide the full path to the directory.

The other solution is to put necessary info about the directory into the name of the files e.g., `algorithms_homework.pdf`, but this approach leads to extremely long file names and information duplication (directory path and filename).
This plugin using Fzf approach avoids this issue.

## How does it work

Under the hood this extensions runs `fd` to find all the files in the searched directories (by default home directory).
I chose `fd` in order to ignore and filter out hidden files and files ignored by git, as well as for it's speed.
This allows for a very fast lookup.

Afterwards the files are filtered using npm `fzf` package to provide user with fast results.
`fd` doesn't support fuzzy searching so I chose to use this package.

