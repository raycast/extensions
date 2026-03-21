# Reverse Shell Generator Changelog

## 1.1.0 - 2026-03-21

### ✨ NEW
* Support for 66+ reverse shell types
* OS filter icons using devicon.dev (Linux, Windows, macOS)

### 💎 IMPROVEMENTS
* Migrated from LocalStorage to Preferences API for better store approval
* Replaced emoji icons with professional devicon.dev SVG icons
* Improved code quality with ESLint and Prettier

### 🐞 FIXES
* Fixed `sqlite3-nc` template missing required fields
* Fixed various template inconsistencies

## 1.0.0 - Initial Release

### ✨ NEW
* Support for 40+ reverse shell types across multiple categories
* Smart categorization system (Shell Tools, Scripting Languages, Compiled Languages, Windows, MSFVenom Payloads)
* OS filtering functionality for Linux, Windows, and macOS
* Multiple copy options: raw command, URL encoding, Base64 encoding, and listener command
* Configuration persistence to auto-save IP address and port
* Detailed command preview interface with markdown rendering
* Export commands to file functionality
* Keyboard shortcuts for all major actions
* Multiple sorting options (by category, name, or OS)
* Command details display including description, supported OS, listener setup, and security warnings
* Complete documentation (README.md with screenshots)
* Extension icon (512x512 PNG)
* TypeScript with full type safety
* Form validation for IP addresses and port numbers
* Code quality enforcement with ESLint and Prettier
