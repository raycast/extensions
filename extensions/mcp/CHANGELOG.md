# Model Context Protocol Changelog

## [1.1.0] - {PR_MERGE_DATE}

### Fixes and Improvements
* Fixed connection issues with MCP servers launched via npx
* Improved environment variable handling for server execution
* Added support for various server launch methods (node, npx, uv)
* Optimized code for better maintainability and debugging
* Enhanced error handling and diagnostic information output
* Fix issue caused by passing `env` in `mcp-config.json`

### Technical Enhancements
* Refactored getProcessedClients.ts for better modularity
* Added connectClient function to unify connection logic
* Created buildProcessEnv function for centralized environment management
* Fixed PATH issues when launching system utilities

## [Initial Version] - 2025-03-24

Introducing the Model Context Protocol integration for Raycast.

Current Features:
* Add Servers via 3 methods:
    * **UI**: Enter a JSON configuration in the Manage MCP command, and have it automatically be registered
    * **Config JSON**: Modify the JSON file, similar to the Claude Desktop App, directly and have it register the Server
    * **Development Servers**: Add folders with code to register the Server