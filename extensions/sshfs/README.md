# SSHFS-Mac Installation Guide

## Prerequisites
- **macFUSE**: FUSE (Filesystem in Userspace) support for macOS
- **sshfs-mac**: SSH filesystem mounting tool

## Installation Process

### 1. Installation via Homebrew
\`\`\`bash
# Install macFUSE
brew install --cask macfuse

# Install sshfs-mac
brew install gromgit/fuse/sshfs-mac
\`\`\`

### 2. System Permission Configuration
1. Navigate to **System Settings** > **Privacy & Security**
2. In the **Security** section, approve macFUSE kernel extension
3. System restart may be required