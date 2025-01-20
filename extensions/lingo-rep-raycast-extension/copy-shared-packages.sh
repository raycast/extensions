#!/bin/bash

# Copy translate package
echo "Copying translate package..."
mkdir -p ./src/shared-packages/translate
rsync -av --delete ../../packages/translate/dist/ ./src/shared-packages/translate/

# Copy lang-options package
echo "Copying lang-options package..."
mkdir -p ./src/shared-packages/lang-options
rsync -av --delete ../../packages/lang-options/dist/ ./src/shared-packages/lang-options/


echo "Copying completed."