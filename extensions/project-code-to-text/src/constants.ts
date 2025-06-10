// src/constants.ts
import type { ProjectEntry } from "./types";

/**
 * Converts bytes to kilobytes.
 * @param bytes Size in bytes.
 * @param defaultValue Default value if bytes is undefined.
 * @returns Size in kilobytes.
 */
export function bytesToKB(bytes: number | undefined, defaultValue = 0): number {
  return bytes !== undefined ? bytes / 1024 : defaultValue;
}

/**
 * Converts bytes to megabytes.
 * @param bytes Size in bytes.
 * @param defaultValue Default value if bytes is undefined.
 * @returns Size in megabytes.
 */
export function bytesToMB(bytes: number | undefined, defaultValue = 0): number {
  return bytes !== undefined ? bytes / (1024 * 1024) : defaultValue;
}

/**
 * Formats a file size in kilobytes with fixed precision.
 * @param bytes Size in bytes.
 * @param precision Number of decimal places (default: 1).
 * @returns Formatted string with KB unit.
 */
export function formatFileSizeKB(bytes: number | undefined, precision = 1): string {
  return `${bytesToKB(bytes).toFixed(precision)} KB`;
}

/**
 * Default maximum file size in bytes for including content.
 * Files larger than this will have their content omitted.
 * (1 MB by default)
 */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

/**
 * Minimum allowed value for max file size setting in MB.
 */
export const MIN_MAX_FILE_SIZE_MB = 0.1; // 100KB

/**
 * Maximum allowed value for max file size setting in MB.
 */
export const MAX_MAX_FILE_SIZE_MB = 50; // 50MB, to prevent accidental excessive memory usage

/**
 * Safety limits to prevent extension crashes with large directories.
 */
export const SAFETY_LIMITS = {
  /** Maximum number of files to process before stopping */
  MAX_FILES: 5000,
  /** Maximum directory scan time in milliseconds */
  MAX_SCAN_TIME_MS: 30000, // 30 seconds
  /** Maximum total size of all included files in bytes */
  MAX_TOTAL_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  /** Show warning after this many files */
  FILES_WARNING_THRESHOLD: 1000,
} as const;

/**
 * Hardcoded ignore patterns applied *before* .gitignore rules.
 * These patterns use the .gitignore glob syntax.
 * They are designed to exclude common build artifacts, caches, and sensitive files.
 */
export const HARDCODED_BASE_IGNORE_PATTERNS: readonly string[] = [
  // Version Control Systems (already broadly covered by specific .git/ etc.)
  // But good to have some common ones if .git is accidentally included or for other VCS.
  "**/.git/",
  "**/.svn/",
  "**/.hg/",
  "**/.bzr/",

  // Hidden files and directories (OS-specific or general)
  ".DS_Store",
  ".AppleDouble",
  ".LSOverride",
  "Thumbs.db",
  "ehthumbs.db",
  "Desktop.ini",
  "**/.Trash*", // macOS trash
  "**/.cache/", // General cache directory

  // Common IDE/Editor specific files and directories
  "**/.vscode/",
  "**/.idea/",
  "**/.project", // Eclipse
  "**/.classpath", // Eclipse
  "**/.settings/", // Eclipse
  "**/*.sublime-workspace",
  "**/*.sublime-project",
  "**/.vs/", // Visual Studio

  // Build artifacts and dependencies (language/framework agnostic)
  "**/dist/",
  "**/build/",
  "**/out/",
  "**/target/", // Common for Java (Maven/Gradle), Rust
  "**/bin/", // Often contains compiled binaries

  // Log files
  "**/*.log",
  "**/logs/",
  "**/npm-debug.log*",
  "**/yarn-debug.log*",
  "**/yarn-error.log*",

  // Temporary files
  "**/*~", // Backup files from editors like Vim/Emacs
  "**/*.tmp",
  "**/*.temp",
  "**/*.swp", // Vim swap files
  "**/*.swo", // Vim swap files

  // Node.js
  "**/node_modules/",
  "**/package-lock.json", // Can be very large and often not needed for code understanding
  "**/yarn.lock", // Same as package-lock.json
  "**/.npm/",
  "**/.pnp.*", // Yarn PnP

  // Python
  "**/__pycache__/",
  "**/*.pyc",
  "**/*.pyo",
  "**/*.pyd",
  "**/.pytest_cache/",
  "**/.mypy_cache/",
  "**/.venv/",
  "**/venv/",
  "**/env/",
  "**/*.egg-info/",
  "**/.eggs/",
  "**/.tox/",
  "**/pip-wheel-metadata/",

  // Ruby
  "**/.bundle/",
  "**/vendor/bundle/",
  "**/Gemfile.lock",
  "**/tmp/", // Also common for Rails

  // PHP / Composer
  "**/vendor/", // Composer dependencies
  "**/composer.lock",

  // Java / JVM
  "**/*.class",
  "**/*.jar",
  "**/*.war",
  "**/*.ear",
  "**/.gradle/",

  // Go
  // "**/vendor/", // Go modules often vendor, but might be part of project code by design

  // Mobile (iOS/Android specific build outputs)
  "**/DerivedData/", // Xcode
  "**/*.xcworkspace/xcuserdata/",
  "**/.cxx/", // Android NDK
  "**/.idea/libraries/", // Android Studio

  // Secrets / Environment files (important to exclude)
  "**/.env",
  "**/.env.*",
  "!**/.env.example", // Allow example/template env files
  "!**/.env.template",
  "**/*.pem",
  "**/*.key",
  "**/.aws/",
  "**/.azure/",
  "**/.gcloud/",

  // Common archive and compressed files
  "**/*.zip",
  "**/*.tar",
  "**/*.gz",
  "**/*.rar",
  "**/*.7z",

  // Common document formats (usually not code)
  "**/*.pdf",
  "**/*.doc",
  "**/*.docx",
  "**/*.xls",
  "**/*.xlsx",
  "**/*.ppt",
  "**/*.pptx",
  "**/*.odt",
  "**/*.ods",
  "**/*.odp",

  // Image files
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.png",
  "**/*.gif",
  "**/*.bmp",
  "**/*.tiff",
  "**/*.webp",
  "**/*.ico",
  "**/*.heic",

  // Audio files
  "**/*.mp3",
  "**/*.wav",
  "**/*.ogg",
  "**/*.flac",
  "**/*.aac",
  "**/*.m4a",

  // Video files
  "**/*.mp4",
  "**/*.avi",
  "**/*.mov",
  "**/*.wmv",
  "**/*.flv",
  "**/*.webm",
  "**/*.mkv",

  // Font files
  "**/*.ttf",
  "**/*.otf",
  "**/*.woff",
  "**/*.woff2",
  "**/*.eot",

  // Database files
  "**/*.db",
  "**/*.sqlite",
  "**/*.sqlite3",
  "**/*.sqlitedb",
  "**/*.db-journal",

  // Large data files (heuristic, can be text but often too large for context)
  "**/*.csv", // Often large, consider size limit
  "**/*.tsv",
  "**/*.jsonl", // Large JSON line files
  "**/*.parquet",
  "**/*.avro",
  "**/*.hdf5",
  "**/*.h5",
  "**/*.pkl",
  "**/*.pickle",
  "**/*.joblib",

  // Executables and shared libraries
  "**/*.exe",
  "**/*.dll",
  "**/*.so",
  "**/*.dylib",
  "**/*.out",
  "**/*.app",
];

/**
 * MIME type prefixes that are generally considered non-textual or binary.
 * Files matching these will have their content omitted.
 */
export const NON_TEXT_MIME_TYPE_PREFIXES: readonly string[] = [
  "image/",
  "audio/",
  "video/",
  "application/octet-stream",
  "application/zip",
  "application/gzip",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/java-archive", // .jar
  "application/x-sqlite3",
  "application/wasm",
  "application/x-font-ttf",
  "application/font-woff",
  "application/font-woff2",
  "application/vnd.ms-fontobject", // .eot
  "application/x-apple-diskimage", // .dmg
  "application/x-iso9660-image", // .iso
];

/**
 * File extensions that are almost always text-based and safe to attempt reading,
 * even if their MIME type is ambiguous or not detected.
 * This acts as a fallback or override for MIME type detection.
 */
export const ALWAYS_TEXT_EXTENSIONS: readonly string[] = [
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".php",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".go",
  ".rs",
  ".swift",
  ".kt",
  ".kts",
  ".dart",
  ".lua",
  ".pl",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  ".sql",
  ".graphql",
  ".gql",
  ".vue",
  ".svelte",
  ".astro",
  ".erb",
  ".mustache",
  ".hbs",
  ".ejs",
  ".jinja",
  ".twig",
  ".tf",
  ".tfvars",
  ".hcl", // Terraform
  ".dockerfile",
  "Dockerfile", // Also filename
  ".gitignore",
  ".gitattributes",
  ".gitmodules",
  ".editorconfig",
  ".babelrc",
  ".eslintrc",
  ".prettierrc",
  ".stylelintrc",
  "LICENSE",
  "README",
  "CONTRIBUTING",
  "CHANGELOG",
  "Makefile",
  "CMakeLists.txt", // Common project files without extensions
  ".csv",
  ".tsv", // Can be large, but are text. Size limit will handle content.
  ".rst", // reStructuredText
  ".tex", // LaTeX
  ".proto", // Protocol Buffers
  ".fbs", // FlatBuffers
  ".gd", // GDScript (Godot Engine)
  ".glsl",
  ".wgsl", // Shading Languages
  ".ex",
  ".exs", // Elixir
  ".erl",
  ".hrl", // Erlang
  ".clj",
  ".cljs",
  ".cljc", // Clojure
  ".hs",
  ".lhs", // Haskell
  ".fs",
  ".fsi",
  ".fsx", // F#
  ".r", // R language
  ".scala",
  ".sbt", // Scala
  ".groovy", // Groovy
  ".tcl", // TCL
  ".ada", // Ada
  ".vb", // VB.NET
  ".pde", // Processing
  ".svg", // SVG is XML-based, often code-like or useful for UI analysis
  ".gp", // Gnuplot script
  ".psd1",
  ".psm1", // PowerShell module files
  ".trigger", // Salesforce Apex Trigger
  ".cls", // Salesforce Apex Class
];

/**
 * Maps file extensions to common language identifiers for syntax highlighting hints.
 */
export const LANGUAGE_EXTENSION_MAP: Readonly<Record<string, string>> = {
  ".py": "python",
  ".js": "javascript",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".php": "php",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".sh": "bash",
  ".md": "markdown",
  ".json": "json",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".xml": "xml",
  ".sql": "sql",
  ".swift": "swift",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".dart": "dart",
  ".vue": "vue",
  ".svelte": "svelte",
  ".cs": "csharp",
  ".fs": "fsharp",
  ".fsi": "fsharp",
  ".fsx": "fsharp",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hrl": "erlang",
  ".hs": "haskell",
  ".lhs": "haskell",
  ".lua": "lua",
  ".pl": "perl",
  ".pm": "perl",
  ".r": "r",
  ".scala": "scala",
  ".sbt": "scala",
  ".groovy": "groovy",
  ".clj": "clojure",
  ".cljs": "clojure",
  ".cljc": "clojure",
  ".tf": "terraform",
  ".tfvars": "terraform",
  ".hcl": "hcl",
  ".proto": "protobuf",
  ".toml": "toml",
  ".ini": "ini",
  ".cfg": "ini",
  ".conf": "ini",
  ".bat": "batch",
  ".cmd": "batch",
  ".ps1": "powershell",
  ".psd1": "powershell",
  ".psm1": "powershell",
  ".dockerfile": "dockerfile",
  dockerfile: "dockerfile", // Filename matching
  ".graphql": "graphql",
  ".gql": "graphql",
  ".gd": "gdscript",
  ".glsl": "glsl",
  ".wgsl": "wgsl",
  ".tex": "latex",
  ".rst": "rst",
  ".svg": "xml", // SVG is XML
  ".gp": "gnuplot",
  ".tcl": "tcl",
  ".ada": "ada",
  ".vb": "vbnet",
  ".pde": "processing",
  ".trigger": "apex", // Salesforce Apex Trigger
  ".cls": "apex", // Salesforce Apex Class
  license: "text",
  readme: "markdown",
  contributing: "markdown",
  changelog: "markdown",
  makefile: "makefile",
  "cmakelists.txt": "cmake",
};

/**
 * Content for the `<ai_instruction>` tag.
 */
export const AI_INSTRUCTION_CONTENT = `This is a complete code listing of the project. Use this document for:
- Analyzing project structure and module organization.
- Understanding relationships and dependencies between files.
- Identifying architectural patterns, design choices, and potential anti-patterns.
- Grasping the main functionality and business logic.
- Suggesting improvements, optimizations, or refactoring opportunities.
- Answering specific questions about the codebase.
Pay close attention to the document structure: first comes the file tree, then the content of each file, properly delimited.
File paths are relative to the project root.
`;

/**
 * Content for the `<ai_analysis_guide>` tag.
 */
export const AI_ANALYSIS_GUIDE_CONTENT = `When analyzing the code, pay attention to:
1.  **Overall Architecture:** Identify the main architectural style (e.g., MVC, microservices, layered).
2.  **Key Components/Modules:** What are the core building blocks and their responsibilities?
3.  **Data Flow:** How does data move through the system?
4.  **Control Flow:** Understand the primary execution paths and decision points.
5.  **External Dependencies:** Note any significant libraries, frameworks, or services used.
6.  **Code Quality Indicators:** Look for code smells, complexity, duplication, and adherence to best practices.
7.  **Potential Issues:** Identify possible bugs, performance bottlenecks, security vulnerabilities, or maintainability concerns.
8.  **Business Logic:** Try to understand the core purpose and functionality the code implements.
9.  **Configuration and Environment:** How is the application configured? Are there different environment settings?
10. **Testing Strategy:** (If test files are included) What kind of tests are present? How comprehensive is the coverage?
`;

/**
 * Generates the file header part of the output string.
 * @param projectRoot The absolute path to the project root.
 * @param maxFileSizeBytes The maximum file size for content inclusion.
 * @param gitignoreUsed Whether a .gitignore file was found and used.
 * @returns The formatted header string.
 */
export function generateOutputHeader(projectRoot: string, maxFileSizeBytes: number, gitignoreUsed: boolean): string {
  return (
    `<ai_instruction>\n${AI_INSTRUCTION_CONTENT}</ai_instruction>\n\n` +
    `<metadata>\n` +
    `  Date created: ${new Date().toISOString()}\n` +
    `  Project root: ${projectRoot}\n` +
    `  Max file size for content: ${bytesToMB(maxFileSizeBytes).toFixed(2)} MB\n` +
    `  .gitignore used: ${gitignoreUsed ? "Yes" : "No"}\n` +
    `</metadata>\n\n`
  );
}

/**
 * Generates the file footer part of the output string.
 * @returns The formatted footer string.
 */
export function generateOutputFooter(): string {
  return `\n<ai_analysis_guide>\n${AI_ANALYSIS_GUIDE_CONTENT}</ai_analysis_guide>\n`;
}

/**
 * Formats the project structure (file tree) into a string.
 * @param entries An array of ProjectEntry objects representing the project structure.
 * @param level The current indentation level.
 * @returns A string representation of the file tree.
 */
export function formatProjectStructure(entries: readonly ProjectEntry[], level = 0): string {
  let structure = "";
  for (const entry of entries) {
    const prefix = "  ".repeat(level);
    const icon = entry.type === "directory" ? "📁" : "📄";
    const sizeInfo = entry.type === "file" && entry.size !== undefined ? ` (${formatFileSizeKB(entry.size)})` : "";
    structure += `${prefix}${icon} ${entry.name}${sizeInfo}\n`;
    if (entry.type === "directory" && entry.children && entry.children.length > 0) {
      structure += formatProjectStructure(entry.children, level + 1);
    }
  }
  return structure;
}

/**
 * Formats the content of all files into a string, wrapped in <file> tags.
 * @param entries An array of ProjectEntry objects.
 * @returns A string containing all file contents.
 */
export function formatFileContents(entries: readonly ProjectEntry[]): string {
  let contents = "";
  for (const entry of entries) {
    if (entry.type === "file") {
      contents += `\n<file path="${entry.path}" size="${formatFileSizeKB(entry.size)}"`;
      if (entry.language) {
        contents += ` language="${entry.language}"`;
      }
      contents += ">\n";
      contents += entry.content || "[Content not available or file was skipped]";
      contents += "\n</file>\n";
    } else if (entry.type === "directory" && entry.children) {
      contents += formatFileContents(entry.children);
    }
  }
  return contents;
}
