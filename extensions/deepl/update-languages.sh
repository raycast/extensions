#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

# Get the available languages from the DeepL API.
response=$(curl -s -X GET "https://api-free.deepl.com/v2/languages" -d auth_key="$DEEPL_API_KEY")

# Prepare the commands block for package.json; one command for each language.
commands_json=$(echo "$response" | jq -r 'map({
  name: .language | ascii_downcase,
  title: "Translate to \(.name)",
  subtitle: "DeepL",
  description: "Translate from an auto detected language to \(.name).",
  mode: "view"
})')

# Update package.json.
tmp=$(mktemp)
jq -r ".commands |= $commands_json" package.json >"$tmp"
mv "$tmp" package.json

jq -r 'map([.name, (.language | ascii_downcase)] | @tsv) | .[]' < <(echo "$response") |
  while IFS=$'\t' read -r name code; do
    echo "import command from \"./command\";

export default command({ name: \"$name\", code: \"$code\" });" >"src/$code.tsx"
  done
