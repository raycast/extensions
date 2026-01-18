#!/bin/bash

# Remix Icon Updater - Downloads latest release if a new version is available

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="${SCRIPT_DIR}/../assets"
ICONS_DIR="${ASSETS_DIR}/icons"
CATALOGUE_FILE="${ASSETS_DIR}/catalogue.json"
VERSION_FILE="${SCRIPT_DIR}/.remix-version"

echo "Checking for updates..."
echo "Fetching: https://api.github.com/repos/Remix-Design/RemixIcon/releases/latest"

# Get latest release info
RELEASE=$(curl -sL -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/Remix-Design/RemixIcon/releases/latest")

LATEST_VERSION=$(echo "${RELEASE}" | jq -r '.tag_name' | sed 's/^v//')
SVG_ASSET_URL=$(echo "${RELEASE}" | jq -r '.assets[] | select(.name | startswith("RemixIcon_Svg_")) | .browser_download_url')

echo "Latest: ${LATEST_VERSION}"
echo "Download URL: ${SVG_ASSET_URL}"

# Check if already up to date
if [[ -f "${VERSION_FILE}" ]]; then
  CURRENT_VERSION=$(cat "${VERSION_FILE}")
  echo "Current: ${CURRENT_VERSION}"

  if [[ "${CURRENT_VERSION}" == "${LATEST_VERSION}" ]]; then
    echo "✓ Already up to date!"
    exit 0
  fi
  echo "Updating ${CURRENT_VERSION} → ${LATEST_VERSION}"
fi

echo ""
echo "Downloading..."

# Download and extract SVG asset
TEMP_DIR=$(mktemp -d)
echo "Temp dir: ${TEMP_DIR}"
curl -sL "${SVG_ASSET_URL}" -o "${TEMP_DIR}/remix.zip"
echo "Downloaded to: ${TEMP_DIR}/remix.zip"
echo "Unzipping..."
unzip -q "${TEMP_DIR}/remix.zip" -d "${TEMP_DIR}"
echo "Contents of temp dir:"
ls -la "${TEMP_DIR}"

# Replace icons (SVG asset has icons directly in root)
echo "Removing old icons: ${ICONS_DIR}"
rm -rf "${ICONS_DIR}"
echo "Copying new icons from ${TEMP_DIR}/icons"
cp -r "${TEMP_DIR}/icons" "${ICONS_DIR}"

echo "Building catalogue..."
echo "Scanning: ${ICONS_DIR}"

# Build catalogue by scanning icons directory
catalogue='{"categories":[]}'
for category_dir in "${ICONS_DIR}"/*; do
  [[ ! -d "${category_dir}" ]] && continue

  category_name=$(basename "${category_dir}")
  echo "  Processing: ${category_name}"

  # URL-encode category name once
  encoded_cat=$(printf '%s' "${category_name}" | jq -sRr @uri)

  # Build all icons for this category in one jq call
  icons=$(cd "${category_dir}" && ls -1 *.svg 2>/dev/null | jq -R -s --arg cat "${category_name}" --arg enc "${encoded_cat}" '
    split("\n") | map(select(length > 0)) | map(
      . as $file | gsub("\\.svg$"; "") | {
        name: .,
        path: "icons/\($cat)/\($file)",
        download_url: "https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/icons/\($enc)/\($file)"
      }
    )')

  catalogue=$(echo "${catalogue}" | jq --arg c "${category_name}" --argjson i "${icons}" \
    '.categories += [{name: $c, icons: $i}]')
done

echo "${catalogue}" | jq '.' >"${CATALOGUE_FILE}"

# Statistics
TOTAL_ICONS=$(echo "${catalogue}" | jq '[.categories[].icons | length] | add')
TOTAL_CATEGORIES=$(echo "${catalogue}" | jq '.categories | length')

# Save version
echo "${LATEST_VERSION}" >"${VERSION_FILE}"

rm -rf "${TEMP_DIR}"

echo ""
echo "✓ Updated to v${LATEST_VERSION} (${TOTAL_ICONS} icons in ${TOTAL_CATEGORIES} categories)"
