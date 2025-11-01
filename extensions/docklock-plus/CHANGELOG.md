# DockLock Plus Changelog

## [v0.2.0] - 2025-10-23

### Major Improvement
- Migrated from legacy Apple URL scheme integrations to the **official DockLock Plus CLI**.
- The new CLI-based implementation is significantly faster, more stable, and provides explicit exit codes for precise error handling.
- Command execution is now fully synchronous and predictable, making failures easier to detect and diagnose.

### Added
- Introduced **Dock Control Mode**, **Move Dock to Display**, and **Allow Dock on Display** commands built on the new CLI.
- Commands now return detailed error information and use persistent views for failure feedback.

### Improved
- Enhanced reliability by processing CLI exit codes directly.
- Simplified code structure and improved overall responsiveness of all DockLock Plus operations.

### Documentation
For full CLI reference and usage examples, visit the [DockLock Plus CLI Documentation](http://docklockpro.com/docks/cli-plus/).

## [Initial Version] - 2025-08-08
