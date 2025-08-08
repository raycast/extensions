#!/bin/bash
set -e

echo "🚀 Running Raycast CI/CD validation locally..."

# 1. Lint and validate (includes TypeScript checking via Ray toolchain)
echo "📦 Linting and validating..."
ray lint

# 2. Build the extension (this does the real TypeScript compilation within Raycast environment)
echo "🏗️ Building extension..."
ray build

echo "✅ All validations passed! Your extension should pass Raycast CI/CD."
echo ""
echo "💡 Note: Use this script instead of direct 'tsc' commands."
echo "   Raycast extensions require the Ray toolchain for proper compilation."