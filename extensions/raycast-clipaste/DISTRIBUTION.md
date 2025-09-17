# Distribution Guide

## For End Users

### Quick Installation

1. **Download the latest release**
   - Visit the [releases page](https://github.com/yourusername/clipaste-raycast-full/releases)
   - Download the latest `.zip` file

2. **Extract and install**

   ```bash
   cd Downloads
   unzip clipaste-raycast-full-v*.zip
   cd clipaste-raycast-full
   chmod +x install.sh
   ./install.sh
   ```

3. **Follow the automated setup**
   - The script will install all dependencies
   - Configure paths automatically
   - Set up the extension in Raycast

### Manual Installation

If the automated script doesn't work:

1. **Install prerequisites**

   ```bash
   # Install Raycast from https://raycast.com
   npm install -g @raycast/api
   brew install node pngpaste
   ```

2. **Install clipaste**
   - Follow instructions at <https://github.com/markomanninen/clipaste>

3. **Set up extension**

   ```bash
   npm install
   npm run build
   npm run dev
   ```

4. **Configure paths in Raycast preferences**

## For Developers

### Building for Distribution

```bash
# Clean build
rm -rf node_modules dist
npm install
npm run build

# Test the build
npm run dev
```

### Creating a Release

1. **Update version**

   ```bash
   npm version patch  # or minor/major
   ```

2. **Build and package**

   ```bash
   npm run build
   zip -r clipaste-raycast-full-v$(node -p "require('./package.json').version").zip \
     src/ assets/ package.json README.md install.sh LICENSE
   ```

3. **Publish to GitHub**
   - Create a new release on GitHub
   - Upload the zip file
   - Include release notes

### Publishing to Raycast Store

1. **Prepare for review**

   ```bash
   npm run build
   npm run lint
   ```

2. **Submit to Raycast**

   ```bash
   npm run publish
   ```

3. **Follow Raycast review process**
   - Ensure compliance with Raycast guidelines
   - Respond to reviewer feedback
   - Update based on requirements

### Distribution Checklist

- [ ] All dependencies documented
- [ ] Installation script works on clean macOS
- [ ] README is comprehensive
- [ ] Error handling is user-friendly
- [ ] Extension builds without warnings
- [ ] All recipes work correctly
- [ ] Path detection is robust
- [ ] Preferences are well-documented

### Release Notes Template

```markdown
## v1.0.0 - Initial Release

### Features
- Multi-mode support (paste, copy, ai, random)
- 20+ predefined recipes
- Automated installation script
- Comprehensive error handling
- Runtime dependency detection

### Installation
1. Download the release zip
2. Extract and run `./install.sh`
3. Configure paths in Raycast preferences

### Requirements
- macOS 10.15+
- Raycast installed
- clipaste CLI tool
- Node.js (installed automatically)
```
