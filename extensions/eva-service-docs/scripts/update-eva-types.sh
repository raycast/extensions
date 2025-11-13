#!/bin/bash

# Script to update EVA type schemas

set -e  # Exit on error

EVA_ENDPOINT="https://api.euw.newblack.test.eva-online.cloud"

echo "Using EVA_ENDPOINT: $EVA_ENDPOINT"

# Remove contents of ./eva-types
echo "Cleaning ./eva-types directory..."
if [ -d "./eva-types" ]; then
    rm -rf ./eva-types/*
else
    mkdir -p ./eva-types
fi

# Generate new types
echo "Generating EVA types..."
./sdk-generator-osx-x64 generate zod -i "$EVA_ENDPOINT" -o ./eva-types --use-string-ids

echo "✓ EVA types updated successfully!"
