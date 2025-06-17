# SonarQube Tools - Raycast Extension

This Raycast extension provides a suite of commands to manage a local SonarQube instance (via Podman) and interact with SonarQube projects. The extension now supports **multi-project** workflows, allowing you to configure and analyze multiple projects seamlessly.

It simplifies common SonarQube workflows, allowing you to start/stop your SonarQube environment, run analyses, and open the SonarQube application directly from Raycast.



## Project Structure

The codebase follows a well-organized domain-based structure for better maintainability:

```
src/
  *.tsx            # Command entry points (direct files in src root)
  lib/             # Implementation logic for commands
    sonarQubeStarter.ts       # SonarQube startup implementation
    sonarQubeStopper.ts       # SonarQube shutdown implementation
    sonarQubeOpener.ts        # SonarQube app opening implementation
    sonarQubeAnalysis.tsx     # SonarQube analysis implementation
    startAnalyzeOpenSonarQubeComponent.tsx # Combined command implementation
  components/      # Reusable UI components
  hooks/           # Custom React hooks
  i18n/            # Internationalization system
  utils/           # Utility functions
    sonarQubeStatus.ts # SonarQube status checking
    projectManagement.ts # Project data management
    common.ts      # Common types and utilities
    index.ts       # Re-exports from all utils
```

## Recent Improvements

### Improved Error Handling (May 24, 2025)

Enhanced error handling in key components with proper error messages and user feedback:

- **Better Error Toasts**: Implemented clear, user-friendly error messages when operations fail
- **Null Path Handling**: Added proper handling for null SonarQube paths in startAnalyzeOpenSonarQubeComponent
- **Edge Case Handling**: Added handling for edge cases such as starting state and preference variations

These improvements make the extension more robust and provide better feedback to users when issues occur.

### Project Structure Reorganization (May 17, 2025)

Completed a major reorganization of the project structure for improved maintainability and testability:

- Separated commands, components, hooks, utils, and i18n into distinct directories with clear responsibilities
- Standardized import paths across the codebase
- Created README files in each major directory to document its purpose
- Added a comprehensive PROJECT_STRUCTURE.md file documenting the project organization

The codebase has been completely reorganized into a domain-based structure for better maintainability and scalability:

- **Commands Directory**: All Raycast command entry points are now organized in a dedicated `commands/` directory with corresponding tests in `commands/__tests__/`
- **Utils Separation**: The large utils.ts file has been split into domain-specific modules:
  - terminal.ts: Terminal command execution utilities
  - sonarQubeStatus.ts: SonarQube server status checking functions
  - projectManagement.ts: Project loading, saving, and management utilities

- **Type Definitions**: Centralized type definitions in a dedicated directory

This reorganization improves:
- **Maintainability**: Easier to find and modify related code
- **Scalability**: New features can be added in their respective domains
- **Testability**: Better organization of test code and test utilities

### Component Architecture Refactoring (May 16, 2025)

The `startAnalyzeOpenSonarQube` component has been refactored into smaller, modular pieces with improved error handling:

- **Custom Hooks**:
  - `useProjectLoader`: Manages loading and state for projects
  - `useSonarQubePath`: Handles resolving the SonarQube path from preferences
  - `useCommandSequencer`: Contains the command sequence execution logic

- **UI Components**:
  - `ProjectEmptyState`: Handles the empty state UI when no projects are available
  - `ProjectListItem`: Renders individual project items
  - `ProjectsList`: Main list component that integrates the above components

This refactoring improves:
- **Modularity**: Each component and hook has a single responsibility
- **Maintainability**: Easier to understand and modify individual parts
- **Reusability**: Components can be reused in other parts of the application

## Features

Currently, the extension offers the following commands, discoverable in Raycast via English or Spanish terms:

1.  **Start SonarQube**
    *   **Description:** Starts the local SonarQube instance using Podman. Checks if SonarQube is already running and notifies the user if so. / Inicia la instancia local de SonarQube usando Podman. Verifica si SonarQube ya está en ejecución y notifica al usuario en ese caso.
    *   **Action:** Executes `podman machine start && podman-compose start` in the configured SonarQube Podman directory, only if SonarQube is not already detected via its API.

2.  **Stop SonarQube**
    *   **Description:** Stops the local SonarQube instance and Podman machine. Attempts to stop ongoing Gradle tasks in all configured projects first. / Para la instancia local de SonarQube y la máquina Podman. Intenta detener primero las tareas de Gradle en curso en todos los proyectos configurados.
    *   **Action:** Executes `./gradlew --stop` in each configured project directory, then `podman-compose stop && podman machine stop` in the configured SonarQube Podman directory.

3.  **Open SonarQube**
    *   **Description:** Opens the SonarQube application or its web URL. / Abre la aplicación SonarQube o su URL web.
    *   **Action:** Opens `http://localhost:9000` in the default browser if SonarQube is running, or the configured SonarQube application if not.

4.  **Start SonarQube, Analyze & Open Project**
    *   **Description:** Starts SonarQube, runs an analysis on a selected project, and opens the results. / Inicia SonarQube, ejecuta un análisis en un proyecto seleccionado y abre los resultados.
    *   **Action:** First selects a project from configured projects, then runs a sequence of commands including starting SonarQube and executing the Sonar analysis for the selected project with progress tracking.

5.  **Run Sonar Analysis**
    *   **Description:** Runs SonarQube analysis on a selected project. / Ejecuta un análisis de SonarQube en un proyecto seleccionado.
    *   **Action:** Allows selection from multiple configured projects and runs the analysis with detailed progress tracking.


## New Features

### Multi-Project Support

The extension now provides full support for managing multiple SonarQube projects:

- **Project Selection UI**: When running commands that require a project, you can now select from all your configured projects.
- **Project Management**: Easily add, edit, and remove projects through the Raycast UI.
- **Individual Configuration**: Each project maintains its own path and settings.

### Enhanced Localization

The extension now features comprehensive internationalization support:

- **Language Selection**: Choose between English and Spanish through the extension preferences.
- **System Detection**: Automatically detects your system language for a seamless experience.
- **Comprehensive Translations**: All user-facing messages, commands, forms, and notifications are fully translated.
- **Flexible Framework**: Easily extendable to support more languages in the future.

### Terminal Improvements

Terminal interaction has been significantly enhanced:

- **Progress Tracking**: Commands now include progress markers and timestamps for better visibility.
- **Better Error Handling**: More informative error messages and improved failure detection.
- **Visual Indicators**: Added visual indicators to show operation progress and success/failure states.
- **Terminal Window Management**: Improved window titling and organization for better workflow.

## Setup & Configuration

1.  **Prerequisites:**
    *   Node.js (v16+)
    *   npm
    *   Podman and `podman-compose` installed and configured on your system.
    *   A SonarQube setup managed by `podman-compose`.
    *   An RFID (or other) Java/Kotlin project configured for SonarQube analysis with Gradle.
    *   (Optional) A saved web application for SonarQube (e.g., via Orion browser).

2.  **Clone/Install this Extension:**
    *   (Currently, this is a local development setup. If published, installation would be via the Raycast Store.)
    *   For local development, ensure the extension code is in your Raycast extensions development directory.

3.  **Install Dependencies:**
    *   Navigate to the extension's root directory (`sonarqube-tools`) in your terminal.
    *   Run `npm install`.

4.  **Run in Development Mode:**
    *   In the extension's root directory, run `npm run dev`.
    *   Raycast should pick up the extension in development mode.

5.  **Configure Preferences in Raycast:**
    *   Open Raycast and search for "SonarQube Tools" (or any of its command titles).
    *   Navigate to the extension in Raycast Preferences (⌘, → Extensions).
    *   Set the following preferences:
        *   **SonarQube Podman Directory (Required):** The absolute path to your SonarQube `podman-compose` setup directory (e.g., `/Users/youruser/Library/Mobile Documents/com~apple~CloudDocs/AREAS/Mango/sonarqube`).
        *   **RFID Project Directory (Required):** The absolute path to your RFID project directory that will be analyzed (e.g., `/Users/youruser/Desktop/Mango/rfid`). This is also used by the "Stop SonarQube" command to attempt to stop Gradle daemons.
        *   **Custom SonarQube App Path/URL (Required, but can be blank):** The absolute path to your SonarQube application (e.g., `/Users/youruser/Applications/Orion/WebApps/SonarQube.app`) or a custom URL (e.g., `http://custom.sonar:9000`). This field will appear on the initial setup screen. If the "Use Custom SonarQube Path/URL" checkbox below is unchecked, and this field is blank, the extension will default to opening `http://localhost:9000`.
        *   **Use Custom SonarQube Path/URL (Optional Checkbox):** Check this if you want to use the path/URL specified in "Custom SonarQube App Path/URL". If unchecked, the extension defaults to opening `http://localhost:9000`, regardless of what is in the custom path field.
        *   **Language (Optional):** Choose your preferred language for the extension interface. Options include:
            * `en` - English (default)
            * `es` - Spanish
            * If not specified, the extension will attempt to use your system language.

6.  **AI Features Setup:**
    *   The extension now leverages Raycast AI for advanced analysis interpretation and code fix suggestions.
    *   No additional configuration is needed for the AI features, as they are automatically enabled.
    *   AI features work by analyzing the SonarQube analysis results from your configured SonarQube server.

## Usage

Once configured, you can search for the commands in Raycast using English or Spanish terms (e.g., "Start SonarQube", "Iniciar SonarQube", "Analyze RFID", "Ejecutar Análisis RFID").

## AI-Powered Features

The extension now includes powerful AI capabilities to help you understand and fix code issues detected by SonarQube.

### AI Analysis Interpretation

After running a SonarQube analysis on your project, the extension will:

1. Automatically fetch the analysis results from your SonarQube server
2. Send the results to Raycast AI for intelligent interpretation
3. Display a comprehensive analysis report with:
   - A summary of the most critical issues
   - Key quality metrics explained in plain language
   - Prioritized list of issues that need attention

### AI Code Fix Suggestions

For each code issue detected by SonarQube, you can:

1. Select the issue in the analysis results view
2. Choose "Get Fix Suggestion" from the action menu
3. Receive an AI-generated code fix with explanation of:
   - What's causing the issue
   - How the suggested fix resolves the problem
   - Best practices to avoid similar issues in the future

### Using AI Features

1. Run an analysis on your project using the "Run Sonar Analysis" command
2. Once the analysis completes, the extension will automatically display the AI analysis results
3. Review the analysis summary and metrics to understand your code quality
4. For specific issues, use the action menu to request AI fix suggestions
5. Copy suggestions directly to your clipboard for easy implementation

> Note: AI features require Raycast AI to be available on your Raycast installation. The extension respects your SonarQube server configuration and will use the same URL and authentication settings you've configured for analysis.



## Development Information

This extension is maintained with quality and reliability in mind. We use automated processes to ensure the extension remains stable and functional.

### Release Process

We're working on:
- Setting up auto-releases when version bumps happen
- Implementing additional code quality checks

## Features Roadmap

### Recently Completed

- **Enhanced SonarQube Status Detection (May 2025)**
  - Intelligent status detection with detailed information about SonarQube state
  - Improved handling for different states: running, starting, initializing, or stopped
  - Automatic retry logic with configurable timeouts for more reliable detection
  - Smart wait times based on detected server state
  - Comprehensive error handling with user-friendly localized messages

- **Enhanced Localization (May 2025)**
  - Comprehensive i18n system with support for English and Spanish
  - All user-facing messages, commands, forms, and notifications fully translated
  - Dynamic language detection based on user preferences with system language fallback
  - Flexible translation system with parameter support for complex messages

- **Multi-Project Support**
  - Implemented multi-project management beyond just a single project
  - Added a project picker to work with multiple SonarQube targets
  - Built a UI for adding, editing, and removing projects
  - Enhanced terminal feedback with progress tracking

- **System Improvements**
  - Improved code quality across the board
  - Added comprehensive support for Raycast API components
  - Better handling of edge cases
  - TypeScript improvements with proper type annotations
  - Enhanced error handling with clear user feedback

### Currently Working On

- **Better Analysis Cancellation**
  - The stop command now tries to shut down any running Gradle tasks
  - Improved process termination when analyses run in separate terminals

- **Terminal Command Refinements**
  - Better error messages when things go sideways
  - Progress tracking for long-running analyses

### Coming Soon

- **Advanced UI/UX Improvements**
  - More detailed analysis progress reporting
  - Custom notification sounds for long-running operations
  - Savable analysis profiles with different settings

- **Better Localization Support**
  - Taking advantage of new Raycast API features for seamless language switching
  - Automatic language detection based on system settings

- **New AI-Powered Features (June 2025)**
  - AI Analysis Interpretation: Quickly understand SonarQube results with AI-generated summaries
  - AI Code Fix Suggestions: Get intelligent fix suggestions for code issues
  - Interactive AI Tools: Request explanations and fixes directly from the results view

## Branding

We're using a custom SonarQube icon in the `assets` directory that maintains the SonarQube brand identity while fitting Raycast's UI guidelines.