#!/usr/bin/env python3
import sys
import json
from pathlib import Path
import re
import shutil

def convert(file_path):
    # Uncomment whichever one of these you need to use. This is not run
    # automatically, but is only there for developer convenience.

    # English files.
    regex_pattern = re.compile("^([a-zA-Z\d]+)			(.+)$")

    # Danish file.
    # regex_pattern = re.compile("^([a-zA-ZÆæØøÅå\d]+)\s/(.+)/\swiki$")

    # German file.
    # regex_pattern = re.compile("^([a-zA-ZäöüßÄÖÜ]+)\s/(.+)/\sipa$")

    # Swedish file.
    # regex_pattern = re.compile("^([a-zA-ZäöÄÖÆæØøÅå\d]+)\s/(.+)/\sipa$")

    # Czech file.
    # Matches normal letters + ě,š,č,ř,ž,ý,á,í,é,ó,ú,ů,ď,ť,ň with their capital versions as well.
    # regex_pattern = re.compile("^([a-zA-ZěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮĚÓ\d]+)\s/(.+)/\swiki$")

    file = open(file_path, 'r', encoding='utf-8')
    file_contents = file.read()
    dict = []
    # Adding the items to this object first removes all duplicates.
    placeholder = {}

    for line in file_contents.splitlines():
        parts = regex_pattern.match(line)
        if not parts:
            continue
        placeholder[parts.group(1).lower()] = {'o': parts.group(1), 'i': parts.group(2)}

    for attr, value in placeholder.items():
        dict.append(value)

    return dict


textFilePath = sys.argv[1]

converted = convert(textFilePath)

fileName = Path(textFilePath).stem
fileName = fileName.split('.')[0]

with open("assets/data/" + fileName + ".json", "w") as outfile:
    json.dump(converted, outfile)

# Copy original data's README file to the converted data directory.
shutil.copy2('original-data/README.md', 'assets/data')
# Append to README.md in the converted data directory.
with open("assets/data/README.md", 'a') as readme:
    readme.write("\n## Important note\n\n")
    readme.write("Do **NOT** edit any of the files in this directory manually. ")
    readme.write("Edit them in\n`original-data/FILENAME.txt` and convert them ")
    readme.write("using the python convertion\nscript found in `script/convert.py`.\n")

green_color = "\033[1;32;48m"
print(green_color + "Successfully converted the data to JSON 🎉")
