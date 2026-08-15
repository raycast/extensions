# Roblox Creator Docs

Fast look-up and search for Roblox Creator Documentation directly from Raycast.

## Features

- **Fast Search**: Quickly find classes, methods, properties, events, callbacks, enums, and globals from the Roblox Engine API
- **Comprehensive Documentation**: Access the full Roblox Creator Documentation including tutorials, guides, and reference materials
- **Smart Caching**: Intelligent caching system that automatically updates when new documentation is available
- **Direct Navigation**: Jump directly to specific API methods, properties, or events with anchor links
- **Detailed Information**: View parameter types, return values, security levels, and full descriptions
- **Category Organization**: Browse by Classes, Enums, Globals, Tutorials, Scripting, and more
- **Customizable Display**: Option to hide icons in search results for a cleaner interface

## Usage

1. Open Raycast and search for "Roblox Creator Docs"
2. Start typing to search through the documentation
3. Press Enter to open the full documentation in your browser
4. Use the detail view to see method signatures, parameters, and descriptions

## Search Tips

- Search by class name (e.g., "Part", "Workspace", "DataStoreService")
- Search by method or property name (e.g., "GetChildren", "Position")
- Search for enums (e.g., "Material", "KeyCode")
- Search for tutorials and guides by topic

## Preferences

You can customize the extension in Raycast preferences:

- **Hide Icons**: Toggle to hide icons next to search results for a more minimal look

## How It Works

This extension automatically downloads and caches the latest Roblox Creator Documentation from the official GitHub repository. The cache is refreshed:

- Every 24 hours (fallback)
- When the documentation repository is updated
- When the extension version changes

Documentation is processed locally for fast, offline-capable searching once cached.

## About

Built for Roblox developers who want quick access to the Creator Documentation without leaving their workflow.

Documentation sourced from: [Roblox Creator Documentation](https://create.roblox.com/docs)