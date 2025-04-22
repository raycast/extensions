# Model Context Protocol Changelog

## [Fix instruction] - {PR_MERGE_DATE}

* Improve instructions and evals examples

## [Fix env issues] - 2025-03-24
* Fix issue caused by passing `env` in `mcp-config.json` 

## [Initial Version] - 2025-03-24

Introducing the Model Context Protocol integration for Raycast.

Current Features:
* Add Servers via 3 methods:
    * **UI**: Enter a JSON configuration in the Manage MCP command, and have it automatically be registered
    * **Config JSON**: Modify the JSON file, similar to the Claude Desktop App, directly and have it register the Server
    * **Development Servers**: Add folders with code to register the Server
* **Automatic Client Creation and Detection**: Based on the provided servers, MCP clients will be created and connected to your servers, and exposed to Raycast AI. Then, it'll automatically pick a Server to use and call the correct Client for it. No additional setup needed!
