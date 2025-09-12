
# GitHub Private Packages
Search and inspect details for private packages you have access to across registries on GitHub.
With the GitHub Private Packages extension, you can discover, filter, and manage your organization's packages in a keyboard-driven way.

## Search and filter packages

- View all packages across multiple registries (npm, Maven, RubyGems, Docker, NuGet, Container)
- Search through packages with advanced filtering by package type
- Sort packages by update date, name, or version count
- View package visibility and metadata
- Copy install commands for your preferred package manager

## Inspect package details

- View detailed package information
- Browse package versions with timestamps
- Access repository information and links
- Copy version-specific install commands
- Open packages directly in your browser

## Getting Started

This extension provides access to GitHub Package Registry through the GitHub API and personal access tokens. To get started, first:

- Login to your GitHub account
- Click on your avatar image in the right upper corner
- From the dropdown menu, click on `Settings`
- On the left-hand side, click on `Developer settings`
- On the left-hand side, click on `Personal access tokens`
- On this page, we'll create a new access token. Click on `Generate new token` in the upper-right
- Leave a `note` for your token (Eg. `Raycast GitHub Packages`). This will help you identify it in the future
- You'll need to check the following boxes to ensure this extension can perform properly:
  - `read:packages` - Required to read package information

- Click `Generate token` and save this value somewhere. **You'll only be able to see this once**


## Configuring the Extension

Launch the GitHub Private Packages Raycast extension. You can select any command to get started.

When launching a command, you'll be presented with a configuration screen asking for two pieces of information:

- `GitHub API Token` - Your personal access token with `read:packages` scope
- `GitHub Organization` - Your organization name (e.g., `octocat`)

You can also configure additional preferences:
- `Sort options` - Choose how packages are sorted (updated at, name, or version count)
- `Preferred NPM package manager` - Select your preferred package manager (npm, yarn, pnpm, or bun)

## Features

### Package Discovery
- Browse packages across all supported registries
- Filter by package type (npm, Maven, RubyGems, Docker, NuGet, Container)
- Search through package names and metadata

### Package Management
- View package details including visibility and repository information
- Browse package versions with creation and update timestamps
- Access direct links to packages and repositories

### Developer Experience
- Copy install commands for your preferred package manager
- Paste install commands directly to your terminal
- Keyboard-driven navigation and actions
- Quick access to package documentation and repositories

## Supported Package Types

- **npm** - JavaScript packages
- **Maven** - Java packages
- **RubyGems** - Ruby packages
- **Docker** - Container images
- **NuGet** - .NET packages
- **Container** - Generic container images

## Requirements

- Raycast 1.0 or later
- GitHub account with access to private packages
- Personal access token with appropriate scopes
- Organization membership (if accessing org packages)

## Contributing

We welcome contributions from the community! If you find any bugs, have feature requests, or want to add new functionality, please don't hesitate to get involved. You can contribute by:

- **Opening an issue** to report bugs or request new features
- **Submitting a pull request** to add improvements or fix issues
- **Suggesting enhancements** for package registry support or user experience

Whether it's adding support for additional package types, improving the search functionality, or enhancing the UI, your contributions help make this extension better for everyone.