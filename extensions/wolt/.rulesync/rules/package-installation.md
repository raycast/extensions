---
targets:
  - "*"
root: false
description: "Always use package manager install commands instead of manually editing dependency files"
globs:
  - "**/package.json"
  - "**/package-lock.json"
  - "**/yarn.lock"
  - "**/pnpm-lock.yaml"
  - "**/requirements.txt"
  - "**/pyproject.toml"
  - "**/Pipfile"
  - "**/Cargo.toml"
  - "**/go.mod"
  - "**/go.sum"
  - "**/composer.json"
  - "**/composer.lock"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/*.csproj"
cursor:
  alwaysApply: true
  globs:
    - "**/package.json"
    - "**/package-lock.json"
    - "**/yarn.lock"
    - "**/pnpm-lock.yaml"
    - "**/requirements.txt"
    - "**/pyproject.toml"
    - "**/Pipfile"
    - "**/Cargo.toml"
    - "**/go.mod"
    - "**/go.sum"
    - "**/composer.json"
    - "**/composer.lock"
    - "**/pom.xml"
    - "**/build.gradle"
    - "**/*.csproj"
---

# Package Installation

**CRITICAL**: Always use the appropriate package manager install command to add dependencies instead of manually editing dependency files. Never write dependencies from memory or guess version numbers.

## Core Principle

Package managers are designed to handle dependency resolution, version management, and lock file updates correctly. Manually editing dependency files (like `package.json`, `requirements.txt`, `Cargo.toml`, etc.) bypasses this system and can lead to:

- Incorrect or outdated versions
- Missing peer dependencies
- Broken lock files
- Version conflicts
- Security vulnerabilities from outdated packages

## Required Workflow

### 1. Identify the Package Manager

Determine which package manager the project uses:

- **npm**: `package.json` → Use `npm install <package>`
- **yarn**: `yarn.lock` or `package.json` → Use `yarn add <package>`
- **pnpm**: `pnpm-lock.yaml` or `package.json` → Use `pnpm add <package>`
- **pip**: `requirements.txt` or `pyproject.toml` → Use `pip install <package>`
- **poetry**: `pyproject.toml` → Use `poetry add <package>`
- **cargo**: `Cargo.toml` → Use `cargo add <package>` or `cargo install <package>`
- **go**: `go.mod` → Use `go get <package>`
- **composer**: `composer.json` → Use `composer require <package>`
- **maven/gradle**: `pom.xml` or `build.gradle` → Use appropriate Maven/Gradle commands
- **nuget**: `.csproj` → Use `dotnet add package <package>`

### 2. Run the Install Command

Execute the appropriate install command for the package manager:

- This ensures the latest compatible version is installed
- Automatically updates lock files
- Resolves peer dependencies correctly
- Updates dependency metadata properly

### 3. Pin the Version

After the package manager installs the dependency, **always pin the version** to ensure reproducibility:

- **npm/yarn/pnpm**: Remove version range prefixes (`^`, `~`) and use exact version (e.g., change `"package": "^1.2.3"` to `"package": "1.2.3"`)
- **pip**: Use exact version in `requirements.txt` (e.g., `package==1.2.3` instead of `package>=1.2.3`)
- **poetry**: Use exact version constraint (e.g., `package = "1.2.3"` instead of `package = "^1.2.3"`)
- **cargo**: Use exact version (e.g., `package = "1.2.3"` instead of `package = "^1.2.3"`)
- **go**: Use exact version in `go.mod` (e.g., `package v1.2.3`)

Pinning versions ensures:

- Reproducible builds across different environments
- Predictable behavior in production
- Prevention of unexpected breaking changes from minor/patch updates
- Easier debugging when issues arise

### 4. Verify Installation

After running the install command and pinning the version:

- Check that the dependency file was updated correctly with the pinned version
- Verify lock files were updated (if applicable)
- Confirm the package is available in the project

## Examples of What NOT to Do

❌ **Don't**: Manually edit `package.json` and add `"package-name": "^1.2.3"` from memory
❌ **Don't**: Guess version numbers when adding dependencies
❌ **Don't**: Manually edit `requirements.txt` without running `pip install`
❌ **Don't**: Edit `Cargo.toml` directly without using `cargo add`
❌ **Don't**: Skip lock file updates by manually editing dependency files
❌ **Don't**: Use outdated version numbers from memory
❌ **Don't**: Bypass package manager dependency resolution
❌ **Don't**: Manually add dependencies to multiple files (e.g., both `package.json` and `package-lock.json`)
❌ **Don't**: Leave version ranges (e.g., `^`, `~`) after installation - always pin to exact versions
❌ **Don't**: Skip pinning versions - this leads to non-reproducible builds

## Examples of What TO Do

✅ **Do**: Run `npm install <package>` to add npm packages
✅ **Do**: Run `yarn add <package>` to add yarn packages
✅ **Do**: Run `pnpm add <package>` to add pnpm packages
✅ **Do**: Run `pip install <package>` and update `requirements.txt` (or use `pip freeze`)
✅ **Do**: Run `poetry add <package>` for Poetry-managed Python projects
✅ **Do**: Run `cargo add <package>` to add Rust dependencies
✅ **Do**: Run `go get <package>` to add Go dependencies
✅ **Do**: Run `composer require <package>` for PHP projects
✅ **Do**: Use `dotnet add package <package>` for .NET projects
✅ **Do**: Let the package manager determine the latest compatible version
✅ **Do**: Allow package managers to update lock files automatically
✅ **Do**: **Pin versions after installation** - Remove version range prefixes (`^`, `~`) and use exact versions
✅ **Do**: Ensure reproducible builds by using exact version numbers

## Package Manager Commands Reference

### JavaScript/TypeScript

- **npm**: `npm install <package>` (or `npm install <package> --save-dev` for dev dependencies)
- **yarn**: `yarn add <package>` (or `yarn add <package> --dev` for dev dependencies)
- **pnpm**: `pnpm add <package>` (or `pnpm add -D <package>` for dev dependencies)

### Python

- **pip**: `pip install <package>` then update `requirements.txt` with `pip freeze > requirements.txt` or manually add entry
- **poetry**: `poetry add <package>` (or `poetry add --group dev <package>` for dev dependencies)
- **pipenv**: `pipenv install <package>` (or `pipenv install --dev <package>` for dev dependencies)

### Rust

- **cargo**: `cargo add <package>` (or `cargo add --dev <package>` for dev dependencies)

### Go

- **go**: `go get <package>` (or `go get <package>@latest` for latest version)

### PHP

- **composer**: `composer require <package>` (or `composer require --dev <package>` for dev dependencies)

### .NET

- **dotnet**: `dotnet add package <package>` (or `dotnet add package <package> --version <version>` for specific version)

### Java

- **Maven**: Edit `pom.xml` and run `mvn install` (or use IDE integration)
- **Gradle**: Add to `build.gradle` and run `./gradlew build` (or use IDE integration)

## Special Cases

### Development Dependencies

Always use the appropriate flag for development dependencies:

- npm: `--save-dev` or `-D`
- yarn: `--dev`
- pnpm: `-D` or `--save-dev`
- poetry: `--group dev`
- cargo: `--dev`

### Version Constraints

If a specific version is required, use the package manager's version specification:

- npm/yarn/pnpm: `npm install package@1.2.3` or `yarn add package@^1.2.3`
- pip: `pip install package==1.2.3`
- cargo: `cargo add package@1.2.3`

### Multiple Packages

Install multiple packages in a single command when possible:

- npm/yarn/pnpm: `npm install package1 package2 package3`
- pip: `pip install package1 package2 package3`
- cargo: `cargo add package1 package2 package3`

## Version Pinning

After the package manager installs a dependency, **always pin the version** to an exact version number:

### JavaScript/TypeScript (package.json)

- Change `"package": "^1.2.3"` → `"package": "1.2.3"`
- Change `"package": "~1.2.3"` → `"package": "1.2.3"`
- Remove all version range prefixes (`^`, `~`, `>=`, `<=`, etc.)

### Python (requirements.txt)

- Use `package==1.2.3` (exact version)
- Avoid `package>=1.2.3` or `package~=1.2.3`

### Python (pyproject.toml with Poetry)

- Change `package = "^1.2.3"` → `package = "1.2.3"`
- Use exact version constraints

### Rust (Cargo.toml)

- Change `package = "^1.2.3"` → `package = "1.2.3"`
- Use exact version numbers

### Go (go.mod)

- Use exact version tags: `package v1.2.3`
- Avoid version ranges

## Summary

1. **Always use package manager commands** - Never manually edit dependency files
2. **Let package managers handle versions** - They know the latest compatible versions
3. **Pin versions after installation** - Remove version ranges and use exact versions for reproducibility
4. **Trust lock files** - Package managers update them correctly
5. **Use appropriate flags** - Distinguish between production and development dependencies
6. **Verify after installation** - Ensure dependencies were added correctly with pinned versions
