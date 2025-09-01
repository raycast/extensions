# Changelog

All notable changes to the Plexus extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-01

### Added
- **Initial release** of Plexus - Localhost Search extension
- Smart discovery of running Node.js development servers on localhost
- Project detection with automatic framework identification
- Quick access to development servers through Raycast interface
- Process management with detailed process information
- Working directory detection for better project context
- Clean, modern TypeScript codebase with async/await patterns
- Comprehensive utility functions for process and project detection

---

## Project Overview

**Plexus - Localhost Search** is a Raycast extension that helps developers discover and manage all running Node.js development servers on localhost with smart project detection, framework identification, and quick access.

### Features
- 🔍 **Smart Discovery** - Automatically finds all running Node.js processes on localhost
- 📊 **Project Detection** - Identifies project names and frameworks
- 🚀 **Quick Access** - Jump directly to your development servers
- 🎯 **Process Management** - View process details and working directories

### Tech Stack
- **Framework**: Raycast Extension API
- **Language**: TypeScript
- **Runtime**: Node.js
- **Utilities**: Process detection via `lsof` and `ps`

---
