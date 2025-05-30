# Changelog

All notable changes to the Kill Bull extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Kill Bull extension
- Remove bullet points and indentation from selected text or clipboard content
- Support for multiple bullet point types (-, *, •, +)
- Preserve markdown headers while cleaning text
- Automatic detection of selected text vs clipboard content
- Direct text replacement when text is selected
- Fallback to clipboard processing when no text is selected

### Features
- Clean bullet points from start of lines only
- Maintain markdown header formatting (#, ##, ###, etc.)
- Handle various indentation types (spaces, tabs)
- Support for different bullet point characters
- Smart text source detection (selected text priority over clipboard)
- Seamless integration with macOS text editing workflows
