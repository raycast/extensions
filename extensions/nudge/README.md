# Nudge - Text Transformation Toolkit

## Overview

Nudge is a powerful Raycast extension designed to simplify text transformations for developers and power users. This is
an initial release with more features and transformations actively in development.

🚧 **Work in Progress** 🚧
This is the first version of Nudge, and we're just getting started! Expect frequent updates and new transformation
capabilities.

## Features

### Current Transformations

- **JSON Conversions**

  - Convert JSON to JavaScript Object
  - Convert JavaScript Object to JSON
  - Format JSON (Pretty Print)
  - Minify JSON
  - Sort JSON Keys

- **Unicode Transformations**

  - Convert text to Unicode
  - Decode Unicode to readable text

- **Whitespace Management**

  - Trim text

- **Encoding/Decoding**

  - URL Encoding/Decoding
  - Base64 Encoding/Decoding
  - HTML Entity Encoding/Decoding

- **Case Transformations**

  - Convert to camelCase
  - Convert to snake_case
  - Convert to kebab-case
  - Convert to PascalCase

### Upcoming Features (Roadmap)

- [x] Base64 Encoding/Decoding
- [x] URL Encoding/Decoding
- [x] HTML Entity Conversion
- [x] Case Transformations (camelCase, snake_case, etc.)
- [x] Advanced JSON manipulation
- [ ] Custom transformation plugins
- [ ] Performance optimizations

## Planned Enhancements

We're committed to expanding Nudge's capabilities. Some exciting features we're exploring:

- Community-driven transformation suggestions
- More complex text manipulation tools
- Integration with other developer workflows
- Performance improvements and bug fixes

## Contribution and Feedback

Your input is crucial! We welcome:

- Feature suggestions
- Bug reports
- Pull requests
- Use cases and transformation ideas

### How to Suggest Features

1. Open a GitHub Issue
2. Describe the transformation
3. Provide example use cases
4. Explain why it would be useful

## Installation

1. Open Raycast
2. Go to Extensions
3. Search for "Nudge"
4. Click Install

## Usage

1. Launch Raycast
2. Type "Nudge" or use the assigned shortcut
3. Paste your text into the input area
4. Choose from available transformation actions

![Screenshot of Nudge Extension](/assets/screenshot.png)

## Keyboard Shortcuts

- `⌘ Enter`: Perform default action
- `⌘ C`: Copy result to clipboard

## Development Status

- **Current Version**: v0.2.0 (Feature Release)
- **Status**: Active Development
- **Last Updated**: February 2025

## Tech Stack

- TypeScript
- React
- Raycast API

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/vbrdnk/Nudge

# Install dependencies
npm install

# Run tests
npm run test

# Build extension
npm run build
```
