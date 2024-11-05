# Shell Optimizer for Raycast

![Shell Optimizer Banner](./assets/banner.png)

A powerful Raycast extension that analyzes and optimizes your shell configuration for better performance and maintainability.

## Features

### 🔍 Real-Time Shell Analysis

- **Startup Time Measurement**: Accurate shell startup time with multiple run averaging
- **Configuration Analysis**: Deep analysis of aliases, functions, and environment variables
- **Plugin Impact Assessment**: Evaluate the performance impact of each plugin
- **Resource Usage**: Track history size, completion scripts, and PATH complexity

### ⚡️ Performance Optimizations

- **Lazy Loading**: Automatically configure lazy loading for heavy tools (NVM, RVM, etc.)
- **PATH Optimization**: Remove duplicates and optimize PATH variable
- **History Management**: Optimize history settings for better performance
- **Completion System**: Enhanced completion system configuration
- **Plugin Management**: Identify and optimize high-impact plugins

### 🔄 Backup System

- **Automatic Backups**: Creates backups before any optimization
- **Version History**: Maintains last 10 backups with metrics
- **Easy Restoration**: One-click restore to any previous configuration
- **Backup Metrics**: Track configuration changes over time

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Open Raycast
3. Search for "Shell Optimizer" in the Extension Store
4. Click Install

## Usage

### Quick Start

1. Open Raycast (⌘ + Space)
2. Type "Optimize Shell"
3. Press Enter to see your shell metrics

### Configuration

1. Open Raycast Settings (⌘ + ,)
2. Navigate to Extensions > Shell Optimizer
3. Configure:
   - Shell Type (zsh/bash)
   - Backup Location

### Available Commands

- **Analyze Shell**: View detailed metrics about your shell configuration
- **Optimize Shell**: Run automatic optimizations with backup
- **Manage Plugins**: Review and optimize plugin impact
- **Manage Backups**: View and restore previous configurations

## Metrics Explained

### Performance Metrics

- **Startup Time**: Shell initialization time (Good: <200ms, Slow: >500ms)
- **Plugin Count**: Number of active plugins
- **Sourced Files**: Count of externally loaded files
- **PATH Length**: Number of PATH segments

### Configuration Metrics

- **Alias Count**: Number of defined aliases
- **Function Count**: Number of shell functions
- **Environment Variables**: Count of exported variables
- **Completion Scripts**: Number of completion definitions

## Optimization Strategies

### 1. Lazy Loading

- Defers loading of heavy tools until needed
- Significantly reduces startup time
- Automatically configures for common tools:
  - Node Version Manager (NVM)
  - Ruby Version Manager (RVM)
  - Python Environment (pyenv)

### 2. History Optimization

- Configures optimal history size
- Removes duplicate commands
- Enables shared history
- Implements intelligent history verification

### 3. Completion Optimization

- Enables completion caching
- Optimizes completion matching
- Reduces completion latency

## Backup Management

### Backup Features

- **Automatic**: Created before each optimization
- **Metrics Storage**: Each backup includes performance metrics
- **Rotation**: Maintains last 10 backups
- **Recovery**: Easy restoration process

### Backup Location

Default: `~/.shellopt/backups`
Format: `{shell}rc_backup_{timestamp}`

## Troubleshooting

### Common Issues

1. **Permission Denied**

   ```bash
   chmod 644 ~/.zshrc
   chmod 644 ~/.bashrc
   ```

2. **Backup Failed**

   ```bash
   mkdir -p ~/.shellopt/backups
   chmod 755 ~/.shellopt
   ```

3. **Optimization Not Working**
   - Check shell type in preferences
   - Verify file permissions
   - Check error messages in Raycast logs

## Development

### Prerequisites

- Node.js 16.10 or higher
- npm 7.x or higher
- Raycast 1.26.0 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/rezapex/shell-optimizer

# Install dependencies
npm install

# Start development
npm run dev
```

### Building

```bash
# Build extension
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Raycast team for the excellent extension API
- Shell optimization community for various techniques
- Contributors and testers

## Support

- [Report an Issue](https://github.com/yourusername/shell-optimizer/issues)
- [Request a Feature](https://github.com/yourusername/shell-optimizer/issues/new)
- [Documentation](https://github.com/yourusername/shell-optimizer/wiki)
