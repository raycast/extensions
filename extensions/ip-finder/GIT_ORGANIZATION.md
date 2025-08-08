# Git Organization Guide - IP Finder Extension

## 📁 Files TO PUSH to Git (Required for Raycast Store)

### Core Extension Files
```
✅ package.json                    # Extension configuration and metadata
✅ package-lock.json              # Dependency lock file (required)
✅ tsconfig.json                  # TypeScript configuration
✅ .eslintrc.js                   # ESLint configuration
✅ raycast-env.d.ts              # Raycast type definitions
```

### Source Code
```
✅ src/
  └── index.tsx                  # Main extension source code
```

### Assets
```
✅ store-icon.png                # 512x512px extension icon (required)
```

### Documentation
```
✅ README.md                     # Extension documentation
✅ CHANGELOG.md                  # Version history
```

## 🚫 Files NOT to Push to Git (Excluded by .gitignore)

### Dependencies and Build Outputs
```
❌ node_modules/                 # NPM dependencies (installed during build)
❌ dist/                        # Build output directory
❌ build/                       # Alternative build output
❌ *.tgz                        # Packaged extensions
```

### Development and Utility Files
```
❌ create-icon.js               # Icon creation utility
❌ create-store-icon.js         # Store icon creation utility
❌ icon-simple.svg              # Development icon files
❌ icon.svg                     # Development icon files
❌ command-icon.png             # Development icon file
```

### Python Files (Not needed for Raycast extension)
```
❌ *.py                         # Python source files
❌ *.pyc                        # Python compiled files
❌ __pycache__/                 # Python cache directory
❌ requirements.txt             # Python dependencies
❌ install.sh                   # Shell installation script
❌ install.bat                  # Batch installation script
```

### Documentation Files (Not needed for store)
```
❌ STORE_CHECKLIST.md           # Development checklist
❌ STORE_SUBMISSION_CHECKLIST.md # Submission checklist
```

### System and IDE Files
```
❌ .DS_Store                    # macOS system files
❌ Thumbs.db                    # Windows thumbnail cache
❌ .vscode/                     # VS Code settings
❌ .idea/                       # IntelliJ IDEA settings
❌ *.log                        # Log files
❌ .env                         # Environment variables
```

## 📋 Git Commands for Clean Repository

### Initial Setup
```bash
# Initialize git repository (if not already done)
git init

# Add .gitignore file
git add .gitignore

# Add only the required files
git add package.json package-lock.json tsconfig.json .eslintrc.js raycast-env.d.ts
git add src/
git add store-icon.png
git add README.md CHANGELOG.md

# Initial commit
git commit -m "Initial commit: IP Finder Raycast extension"
```

### Regular Development Workflow
```bash
# Check what files are staged
git status

# Add only the files you want to track
git add src/index.tsx
git add package.json
git add README.md
git add CHANGELOG.md

# Commit changes
git commit -m "Update: [describe your changes]"
```

### Before Pushing to GitHub
```bash
# Check what will be pushed
git status

# Verify no unwanted files are included
git diff --cached --name-only

# Push to remote repository
git push origin main
```

## 🎯 Raycast Store Submission Files

When submitting to the Raycast Extensions repository, include only these files:

```
📦 Extension Package:
├── package.json
├── package-lock.json
├── tsconfig.json
├── .eslintrc.js
├── raycast-env.d.ts
├── src/
│   └── index.tsx
├── store-icon.png
├── README.md
└── CHANGELOG.md
```

## ⚠️ Important Notes

1. **Never commit `node_modules/`** - It's large and will be installed during build
2. **Never commit `dist/`** - It's generated during build process
3. **Keep `package-lock.json`** - Required for consistent builds
4. **Include `store-icon.png`** - Required for store submission
5. **Remove Python files** - Not needed for Raycast extension
6. **Remove development utilities** - Not needed for production

## 🔍 Verification Commands

```bash
# Check what files are currently tracked
git ls-files

# Check what files are ignored
git status --ignored

# Verify no large files are being tracked
git ls-files | xargs ls -la | sort -k5 -nr | head -10
```

---

**Remember**: The goal is to keep the repository clean and only include files necessary for the Raycast extension to function and be published to the store. 