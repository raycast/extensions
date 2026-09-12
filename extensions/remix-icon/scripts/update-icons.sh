#!/bin/bash

# Remix Icon Updater - Downloads latest release, compresses SVGs, and builds catalogue

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."
LOCAL_DIR="${PROJECT_DIR}/.local"
ICONS_DIR="${LOCAL_DIR}/icons"
ASSETS_DIR="${PROJECT_DIR}/assets"
COMPRESSED_DIR="${ASSETS_DIR}/icons-compressed"
CATALOGUE_FILE="${ASSETS_DIR}/catalogue.json"
METADATA_FILE="${ASSETS_DIR}/metadata.json"

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
if [[ -f "${METADATA_FILE}" ]]; then
  CURRENT_VERSION=$(jq -r '.version' "${METADATA_FILE}")
  echo "Current: ${CURRENT_VERSION}"

  if [[ "${CURRENT_VERSION}" == "${LATEST_VERSION}" ]]; then
    echo "✓ Already up to date!"
    exit 0
  fi
  echo "Updating ${CURRENT_VERSION} → ${LATEST_VERSION}"
fi

echo ""
echo "Downloading..."

# Create local directory
mkdir -p "${LOCAL_DIR}"

# Download and extract SVG asset
TEMP_DIR=$(mktemp -d)
echo "Temp dir: ${TEMP_DIR}"
curl -sL "${SVG_ASSET_URL}" -o "${TEMP_DIR}/remix.zip"
echo "Downloaded to: ${TEMP_DIR}/remix.zip"
echo "Unzipping..."
unzip -q "${TEMP_DIR}/remix.zip" -d "${TEMP_DIR}"

# Move icons to .local directory
echo "Moving icons to: ${ICONS_DIR}"
rm -rf "${ICONS_DIR}"
cp -r "${TEMP_DIR}/icons" "${ICONS_DIR}"
rm -rf "${TEMP_DIR}"

echo ""
echo "Compressing icons by category..."

# Create compressed directory
rm -rf "${COMPRESSED_DIR}"
mkdir -p "${COMPRESSED_DIR}"

# Process each category and compress to JSON
for category_dir in "${ICONS_DIR}"/*; do
  [[ ! -d "${category_dir}" ]] && continue
  
  category_name=$(basename "${category_dir}")
  echo "  Compressing: ${category_name}"
  
  # Build JSON object with all SVGs in this category
  echo "{" > "${COMPRESSED_DIR}/${category_name}.json"
  first=true
  
  for icon_file in "${category_dir}"/*.svg; do
    [[ ! -f "${icon_file}" ]] && continue
    
    icon_name=$(basename "${icon_file}" .svg)
    
    # Add comma if not first item
    [[ "${first}" == "false" ]] && echo "," >> "${COMPRESSED_DIR}/${category_name}.json"
    first=false
    
    # Add icon with JSON-escaped SVG content
    printf '  "%s": %s' "${icon_name}" "$(jq -Rs . < "${icon_file}")" >> "${COMPRESSED_DIR}/${category_name}.json"
  done
  
  echo -e "\n}" >> "${COMPRESSED_DIR}/${category_name}.json"
done

echo ""
echo "Building catalogue from compressed files..."

# Build catalogue from compressed JSON files
catalogue='{"categories":[]}'
for category_file in "${COMPRESSED_DIR}"/*.json; do
  [[ ! -f "${category_file}" ]] && continue
  
  category_name=$(basename "${category_file}" .json)
  echo "  Processing: ${category_name}"
  
  # Get icon names from compressed JSON
  icons=$(jq -r 'keys | @json' "${category_file}")
  
  catalogue=$(echo "${catalogue}" | jq --arg c "${category_name}" --argjson i "${icons}" \
    '.categories += [{name: $c, icons: $i}]')
done

echo "${catalogue}" | jq '.' >"${CATALOGUE_FILE}"

# Statistics
TOTAL_ICONS=$(echo "${catalogue}" | jq '[.categories[].icons | length] | add')
TOTAL_CATEGORIES=$(echo "${catalogue}" | jq '.categories | length')
COMPRESSED_FILES=$(ls -1 "${COMPRESSED_DIR}" | wc -l | xargs)

# Save metadata with version
cat > "${METADATA_FILE}" <<EOF
{
  "version": "${LATEST_VERSION}",
  "updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo ""
echo "✓ Updated to v${LATEST_VERSION}"
echo "  Icons: ${TOTAL_ICONS} in ${TOTAL_CATEGORIES} categories"
echo "  Compressed: ${COMPRESSED_FILES} JSON files"
