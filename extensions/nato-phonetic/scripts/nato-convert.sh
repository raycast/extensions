#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title NATO Quick Convert
# @raycast.mode compact
# @raycast.packageName NATO Phonetic

# Optional parameters:
# @raycast.icon images/icon.png
# @raycast.argument1 { "type": "text", "placeholder": "Text to convert" }

# Documentation:
# @raycast.description Convert text to NATO phonetic alphabet
# @raycast.author christian

input="$1"
result=""

for (( i=0; i<${#input}; i++ )); do
  char="${input:$i:1}"
  upper=$(echo "$char" | tr '[:lower:]' '[:upper:]')
  case $upper in
    A) result+="Alpha " ;;
    B) result+="Bravo " ;;
    C) result+="Charlie " ;;
    D) result+="Delta " ;;
    E) result+="Echo " ;;
    F) result+="Foxtrot " ;;
    G) result+="Golf " ;;
    H) result+="Hotel " ;;
    I) result+="India " ;;
    J) result+="Juliet " ;;
    K) result+="Kilo " ;;
    L) result+="Lima " ;;
    M) result+="Mike " ;;
    N) result+="November " ;;
    O) result+="Oscar " ;;
    P) result+="Papa " ;;
    Q) result+="Quebec " ;;
    R) result+="Romeo " ;;
    S) result+="Sierra " ;;
    T) result+="Tango " ;;
    U) result+="Uniform " ;;
    V) result+="Victor " ;;
    W) result+="Whiskey " ;;
    X) result+="X-ray " ;;
    Y) result+="Yankee " ;;
    Z) result+="Zulu " ;;
    0) result+="Zero " ;;
    1) result+="One " ;;
    2) result+="Two " ;;
    3) result+="Three " ;;
    4) result+="Four " ;;
    5) result+="Five " ;;
    6) result+="Six " ;;
    7) result+="Seven " ;;
    8) result+="Eight " ;;
    9) result+="Nine " ;;
    " ") result+="| " ;;
    *) ;;
  esac
done

# Trim trailing space
result="${result% }"
echo "$result"
