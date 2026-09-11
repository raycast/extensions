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
