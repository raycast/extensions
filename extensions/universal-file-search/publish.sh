#!/bin/bash

echo "🚀 Publishing Universal File Search Extension to Raycast Store"
echo ""
echo "This script will guide you through the publishing process."
echo ""
echo "Since you've already authenticated with GitHub, the process should continue automatically."
echo "If prompted for authentication again, use the code shown in the terminal."
echo ""
echo "Press Enter to continue..."
read

# Run the publish command
npm run publish

echo ""
echo "✅ If successful, a pull request has been created to the Raycast extensions repository."
echo "📝 The Raycast team will review your extension and publish it to the store."
echo ""
echo "You can check the status of your pull request at:"
echo "https://github.com/raycast/extensions/pulls"