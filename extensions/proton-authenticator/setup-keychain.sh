#!/bin/bash

# Setup script for storing Proton Authenticator export in macOS Keychain
# Usage: ./setup-keychain.sh /path/to/your/export.json

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 /path/to/export.json"
    echo "Example: $0 ~/Downloads/Proton_Authenticator_backup_2025-08-02.json"
    exit 1
fi

EXPORT_FILE="$1"

if [ ! -f "$EXPORT_FILE" ]; then
    echo "Error: File '$EXPORT_FILE' not found"
    exit 1
fi

echo "Reading JSON export from: $EXPORT_FILE"
JSON_CONTENT=$(cat "$EXPORT_FILE" | jq -c .)

echo "Storing in macOS Keychain..."
security add-generic-password \
    -a "PROTON_AUTH_CODES" \
    -s "PROTON_AUTH_CODES" \
    -w "$JSON_CONTENT" \
    -U

if [ $? -eq 0 ]; then
    echo "✅ Successfully stored Proton Authenticator data in Keychain"
    echo "You can now run the Raycast extension!"
else
    echo "❌ Failed to store data in Keychain"
    exit 1
fi