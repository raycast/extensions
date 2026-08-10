# Convert dictionaries from txt to JSON

To convert dictionary data from txt to JSON you need to run `convert.py`
referencing the file you want to convert. It is necessary to be in the
extension's root folder when running the script. Before running the script,
check if the language you are converting from uses any special characters. If
so, you need to add those characters to the regex in `convert.py`.

Here is an example of how the script is run:

```zsh,bash
cd path/to/extension-root
script/convert.py original-data/EN_dictionary.txt
```
