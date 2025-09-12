# Fuzzy File Search

Search for files using their full paths with a fuzzy find algorithm.

![screenshot](./metadata/fuzzy-file-search-1.png)

This extension is meant as a replacement/alternative for the built-in **Search Files**.  
Raycast’s built-in extension _Search Files_ only searches for filenames, which is not ideal when organizing files using directories.  
Imagine the following scenario:

```
~/
    algorithms/
        homework.pdf
    data-structures/
        homework.pdf
```

Using Raycast’s built-in _Search Files_, you can search for `homework.pdf`, but you will get both files.  
With **Fuzzy File Search**, you can search for `algo homework` and directly find `~/algorithms/homework.pdf`.  
This functionality is very helpful for highly structured data in deeply nested directories.

Raycast’s _Search Files_ allows you to specify in which directory the file is located, e.g., `homework in ~/algorithms/`.  
However, this approach requires the user to know the exact directory and provide the full path.

Another solution is to add directory information into filenames, e.g., `algorithms_homework.pdf`, but this leads to extremely long filenames and duplication of information (directory path + filename).  
This plugin, using the **fzf** approach, avoids that issue.

## How does it work

Under the hood, this extension runs `fd` to find all the files in the searched directories (by default, the home directory).  
I chose `fd` because it ignores hidden files and files ignored by Git, while also being fast.  
This allows for very quick lookups.

Afterwards, the files are filtered using the npm `fzf` package to provide the user with fast results.  
Since `fd` doesn’t support fuzzy searching, I chose to use this package.

> **Note:** This Raycast extension automatically installs `fd` on the first run.
