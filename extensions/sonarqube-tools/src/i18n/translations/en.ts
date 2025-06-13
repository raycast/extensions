/**
 * English translations
 */

const translations = {
  common: {
    success: "Success",
    failure: "Failure",
    error: "Error",
    warning: "Warning",
    loading: "Loading...",
    completed: "Completed",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    select: "Select",
    continue: "Continue",
    back: "Back",
  },

  terminal: {
    completed: "Script in terminal finished. You can close this window.",
    executing: "Executing: {{command}}",
    preparation: "Preparing environment...",
    commandRunning: "Command in progress...",
    commandSuccess: "Command completed successfully",
    commandError: "Command failed: {{error}}",
    openingTerminal: "Opening terminal...",
    progressTracking: "Progress: {{status}}",
  },

  ai: {
    analyzing: "AI is analyzing your SonarQube results...",
    analysisComplete: "AI Analysis Complete",
    viewReport: "View the detailed AI analysis report",
    waitingForResults: "Waiting for SonarQube to process results...",
    fetchingResults: "Fetching SonarQube analysis results...",
    noResults: "No analysis results found",
    verifyCompletion: "Make sure SonarQube analysis completed successfully",
    analysisFailed: "Failed to analyze results with AI",
    fixSuggestion: "Get Fix Suggestion",
    fixIssue: "Fix Issue {{number}}",
    aiSummary: "AI Analysis for {{projectName}}",
    openInSonarQube: "Open in SonarQube",
    copyAnalysis: "Copy AI Analysis",
  },

  commands: {
    startSonarQube: {
      title: "Start SonarQube",
      description:
        "Starts local SonarQube instance using Podman. Checks if SonarQube is already running and notifies the user in that case.",
      starting: "Starting SonarQube...",
      alreadyRunning: "SonarQube is already running",
      startSuccess: "SonarQube started successfully",
      startError: "Error starting SonarQube",
      startingPodman: "Starting Local SonarQube (Podman)",
      success: "SonarQube started",
      accessUrl: "Access at",
      waiting: "Waiting for SonarQube to fully start",
      pleaseWait: "SonarQube is starting up, please wait a moment",
      checkingStatus: "Checking SonarQube status...",
      initializing: "SonarQube might be initializing. Checking again with longer timeout...",
      statusChecking: "Checking SonarQube status...",
      statusInitializing: "SonarQube might be initializing. Checking again with longer timeout...",
      statusRunning: "SonarQube is running",
      statusNotRunning: "SonarQube is not running",
      statusUnknown: "SonarQube status unknown",
      initializingContinue: "SonarQube may still be initializing. Continuing anyway...",
    },

    stopSonarQube: {
      title: "Stop SonarQube",
      description:
        "Stops the local SonarQube instance and Podman machine. Attempts to stop ongoing Gradle tasks in all configured projects first.",
      stopping: "Stopping SonarQube...",
      stoppingGradle: "Stopping Gradle tasks first...",
      stopSuccess: "SonarQube has been stopped successfully",
      stopError: "Failed to stop SonarQube",
    },

    openSonarQubeApp: {
      title: "Open SonarQube",
      description: "Opens the SonarQube application or its web URL.",
      opening: "Opening SonarQube...",
      openError: "Failed to open SonarQube",
    },

    runSonarAnalysis: {
      title: "Run SonarQube Analysis",
      description: "Select a project to run SonarQube analysis and open the app. Manage projects from this command.",
      noProjects: "No projects configured",
      selectProject: "Select a project",
      addNewProject: "Add new project",
      editProject: "Edit project",
      deleteProject: "Delete project",
      runningAnalysis: "Running SonarQube analysis",
      analysisSuccess: "SonarQube analysis completed successfully",
      analysisError: "Failed to run SonarQube analysis",
      searchPlaceholder: "Search projects...",
    },

    allInOne: {
      title: "Start Sonarqube & Analyze Project",
      description: "Starts SonarQube if needed and runs analysis in one step.",
      actionTitle: "Start SonarQube & Run Analysis",
      success: "SonarQube Sequence Initiated for {{projectName}}",
      error: "Failed to Initiate SonarQube Sequence",
      configureFirst: "Please configure projects in the 'Run SonarQube Analysis' command first.",
    },

    startAnalyzeOpenSonarQube: {
      title: "Start Sonarqube & Analyze Project",
      description: "Starts SonarQube, then select a project to run analysis. Manage projects from this command.",
      initializing: "Initializing SonarQube environment...",
      startingAnalysis: "Starting SonarQube analysis...",
      openingResults: "Opening SonarQube results...",
      allInOneSuccess: "SonarQube started and analysis completed",
      allInOneError: "Failed to complete SonarQube workflow",
    },
  },

  projects: {
    management: {
      title: "Project Management",
      addProject: "Add Project",
      editProject: "Edit Project",
      deleteProject: "Delete Project",
      confirmDelete: "Are you sure you want to delete this project?",
      goToManager: "Go to Project Manager",
      notImplemented: "This would navigate to project manager (not implemented)",
      actions: "Actions",
    },
    form: {
      name: "Project Name",
      path: "Project Path",
      namePlaceholder: "Enter project name",
      pathPlaceholder: "Enter full path to project",
      pathInfo: "Enter path or use the Choose Directory button to select",
      filePicker: "Click to select a project folder using the file explorer",
      chooseDirectory: "Choose Directory",
      nameRequired: "Project name is required",
      pathRequired: "Project path is required",
      saveSuccess: "Project saved successfully",
      saveError: "Failed to save project",
      deleteSuccess: "Project deleted successfully",
      deleteError: "Failed to delete project",
    },
  },

  errors: {
    commandNotFound: "Command not found. Make sure all required tools are installed.",
    permissionDenied: "Permission denied. Try running with proper permissions.",
    fileNotFound: "File or directory not found. Check that all paths are correct.",
    connectionFailed: "Connection failed. Check your network settings.",
    connectionRefused: "Connection refused. Make sure the service is running.",
    cannotConnect: "Cannot connect. Verify the service is running and accessible.",
    timeout: "Operation timed out. The service might be slow or unavailable.",
    appleScriptError: "AppleScript error. Try again or restart Raycast.",
    terminalIssue: "Terminal issue. Make sure Terminal app is available.",
    generic: "An error occurred: {{message}}",
  },

  preferences: {
    sonarqubePodmanDir: {
      title: "SonarQube Podman Directory",
      description: "Directory containing Podman setup for SonarQube.",
      placeholder: "/path/to/sonarqube_podman_dir",
    },
    sonarqubeAppPath: {
      title: "SonarQube App Path",
      description:
        "Optional path to SonarQube application. If specified, this app will be opened directly. Leave blank to use localhost with the port specified below.",
      placeholder: "e.g., /Applications/SonarQube.app or leave blank to use localhost",
    },
    sonarqubePort: {
      title: "SonarQube Port",
      description:
        "Port for SonarQube server when accessing via localhost. Only used when no app path is specified above.",
      placeholder: "9000",
    },
    language: {
      title: "Language",
      description: "Interface language for the extension. If not set, will try to use your system language.",
      options: {
        en: "English",
        es: "Spanish (Español)",
        auto: "Auto-detect (System language)",
      },
    },
  },
};

export default translations;
