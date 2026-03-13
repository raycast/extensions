# Model Context Protocol Changelog

## [1.1.0] - 2025-05-16

### Fixes and Improvements

- Fixed connection issues with MCP servers launched via npx
- Improved environment variable handling for server execution
- Added support for various server launch methods (node, npx, uv)
- Optimized code for better maintainability and debugging
- Enhanced error handling and diagnostic information output
- Fix issue caused by passing `env` in `mcp-config.json`
- Fixed issue where empty tool parameters were not being parsed correctly
- Added timeout parameter to run-mcp-tool for better handling of long-running tools (default is 60000ms)
- Added failed tools to be returned in get-mcp-clients
- Getting tools works asynchronously, increasing performance

### Technical Enhancements

- Refactored getProcessedClients.ts for better modularity
- Added connectClient function to unify connection logic
- Created buildProcessEnv function for centralized environment management
- Fixed PATH issues when launching system utilities


## [Fix instruction] - 2025-04-22

* Improve instructions and evals examples


## [Fix env issues] - 2025-03-24
* Fix issue caused by passing `env` in `mcp-config.json` 


## [Initial Version] - 2025-03-24

Introducing the Model Context Protocol integration for Raycast.

Current Features:

- Add Servers via 3 methods:
  - **UI**: Enter a JSON configuration in the Manage MCP command, and have it automatically be registered
  - **Config JSON**: Modify the JSON file, similar to the Claude Desktop App, directly and have it register the Server
  - **Development Servers**: Add folders with code to register the Server
- **Automatic Client Creation and Detection**: Based on the provided servers, MCP clients will be created and connected to your servers, and exposed to Raycast AI. Then, it'll automatically pick a Server to use and call the correct Client for it. No additional setup needed!
