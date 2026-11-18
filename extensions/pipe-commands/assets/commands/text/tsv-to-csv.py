#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title TSV to CSV
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

import csv
import sys

rows = (r for r in csv.reader(sys.stdin, delimiter="	") if any(f.strip() for f in r))
csv.writer(sys.stdout, quoting=csv.QUOTE_MINIMAL).writerows(rows)
