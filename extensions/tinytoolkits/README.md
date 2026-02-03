# TinyToolkits

A collection of handy developer tools for [Raycast](https://www.raycast.com), featuring a calculator with multiple output formats, translation capabilities, Redmine integration, and multi-engine search functionality.


## Features

### Calculator
A powerful calculator with support for multiple output formats:
- **Decimal** - Standard numeric output
- **Hexadecimal** - Hex representation (e.g., `0xFF`)
- **Integer** - Integer representation
- Choose between Node.js function or Python eval backend

### Translate
Translate text to multiple languages using [LibreTranslate](https://libretranslate.com/):
- Support for Chinese, English, Spanish, French, German, Japanese, and Korean
- Auto-translate as you type (configurable)
- Uses your own LibreTranslate instance for privacy

### Search Browser
Search across multiple search engines simultaneously:
- Google
- Bing
- Baidu
- Quick access to search results from your favorite engines

### Redmine Integration
Quick access to your Redmine project management:
- Search issues and projects
- Quick links to common Redmine pages
- Connect to your self-hosted Redmine instance

## Requirements

- [Raycast](https://www.raycast.com/) for macOS or Windows
- Node.js 18+ (for development)
- (Optional) LibreTranslate instance for translation
- (Optional) Redmine instance for project tracking

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "TinyToolkits"
3. Install the extension


## Configuration

### LibreTranslate Server

Configure your LibreTranslate instance in Raycast extension preferences:

1. Open Raycast Preferences
2. Navigate to Extensions → TinyToolkits
3. Set **LibreTranslate Server URL** 
4. Choose your **Default Target Language**
5. Enable/disable **Auto Translate**

### Redmine Server

To use Redmine integration:

1. Open Raycast Preferences
2. Navigate to Extensions → TinyToolkits
3. Set **Redmine Server URL**

### Calculator Backend

Choose your preferred calculator backend:
- **NodeJS Function** - Pure JavaScript evaluation
- **Python Eval** - Uses Python's eval (requires Python installed)

## Tech Stack

- **TypeScript** - Type-safe development
- **React** - UI components
- **Raycast API** - Raycast extension framework
- **LibreTranslate** - Privacy-focused translation

