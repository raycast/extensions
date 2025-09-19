#!/bin/bash

# Deploy script for Turbo Speedo Video Raycast extension

set -e

echo "🚀 Deploying Turbo Speedo Video extension..."

# Check if Raycast CLI is installed
if ! command -v raycast &> /dev/null; then
    echo "❌ Raycast CLI not found. Please install it first:"
    echo "   npm install -g @raycast/cli"
    exit 1
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found. Please install it first:"
    echo "   brew install ffmpeg"
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test

# Build the extension
echo "🔨 Building extension..."
npm run build

# Lint check
echo "🔍 Running linter..."
npm run lint

# Type check
echo "📝 Running type check..."
npm run type-check

echo "✅ All checks passed!"
echo "📦 Extension is ready for deployment"
echo ""
echo "To publish to Raycast Store:"
echo "1. raycast publish"
echo ""
echo "To install locally:"
echo "1. raycast dev"
