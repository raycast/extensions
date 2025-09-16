#!/usr/bin/env zsh
# @raycast.schemaVersion 1
# @raycast.title Anedot: Search by Name (+ Email/Phone)
# @raycast.packageName Anedot
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "First Last [email] [phone]" }
# @raycast.icon 🔎

input="$1"

make_url=$(python3 - <<'PY' "$input"
import sys, re, urllib.parse

raw = sys.argv[1].strip()
tokens = [t for t in raw.split() if t.strip()]

email = None
phone = None
name_parts = []

email_re = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
# Accept numbers, spaces, dashes, dots, parentheses, plus
phone_chars = re.compile(r'^[\d\-\.\s\(\)\+]+$')

for t in tokens:
    if email is None and email_re.match(t):
        email = t
    elif phone is None and phone_chars.match(t) and re.sub(r'\D', '', t):
        # treat as phone if it has at least 7 digits
        digits = re.sub(r'\D', '', t)
        if len(digits) >= 7:
            phone = digits
        else:
            name_parts.append(t)
    else:
        name_parts.append(t)

# Derive first/last from remaining name parts
first = name_parts[0] if name_parts else ""
last  = name_parts[-1] if len(name_parts) >= 2 else ""

first = first.lower()
last  = last.lower()

def enc(s): return urllib.parse.quote(s) if s else ""

base = "https://admin.anedot.com/admin/donations?commit=Apply"
qs = (
    f"&query%5Bfirst_name%5D={enc(first)}"
    f"&query%5Blast_name%5D={enc(last)}"
    f"&query%5Bemail%5D={enc(email or '')}"
    f"&query%5Bphone%5D={enc(phone or '')}"
    f"&query%5Bamount%5D=&query%5Bdate_start%5D=&query%5Bdate_end%5D=&query%5Buid%5D="
    f"&query%5Baccount_id%5D=&query%5Baction_page_id%5D="
)
print(base + qs)
PY
)

open "$make_url"
