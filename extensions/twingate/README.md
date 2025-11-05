# Twingate Raycast Extension

A powerful Raycast extension that allows you to quickly browse, search, and access your Twingate resources directly from Raycast.

## 🚀 Features

### **Resource Management**
- **🔍 Advanced Search**: Search resources by name, address, network, or alias with multi-term support
- **⭐ Favorites System**: Mark frequently used resources as favorites with priority sorting
- **🕒 Recent Resources**: Track and quickly access recently used resources
- **🌐 One-Click Access**: Open resources directly in your browser
- **📋 Copy Actions**: Copy URLs, addresses, aliases, and resource names

### **Enhanced User Experience**
- **📊 Resource Details**: View network names, aliases, and connection status
- **🎯 Smart Sorting**: Favorites-first sorting in search, chronological in recent
- **⚡ Fast Performance**: Cached API calls with intelligent refresh
- **🐛 Debug Mode**: Comprehensive logging and debugging tools
- **⌨️ Customizable Shortcuts**: Personalize all keyboard shortcuts

### **Developer Features**
- **📈 API Monitoring**: Request/response logging with performance metrics
- **🔧 Cache Management**: Intelligent caching with hit/miss tracking
- **📤 Debug Export**: Export logs for troubleshooting
- **⚙️ Preferences Integration**: Native Raycast settings integration

## 📦 Installation

### From Raycast Store
1. Open Raycast (`Cmd+Space`)
2. Type "Store" and press Enter
3. Search for "Twingate"
4. Click "Install"

### Manual Installation
1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start development mode
4. The extension will appear in Raycast

## ⚙️ Configuration

### Required Settings
1. **Open Raycast Preferences** (`Cmd+,`)
2. **Navigate to Extensions** → **Twingate**
3. **Configure required fields**:
   - **API Key**: Your Twingate API key from the admin console
   - **Network URL**: Your Twingate network URL (e.g., `https://company.twingate.com`)

### Optional Customization
Customize keyboard shortcuts for all actions:
- **Global Actions**: Refresh Resources, Clear Data, Debug Mode, Export Logs
- **Resource Actions**: Toggle Favorite, Copy URL, Copy Address, Copy Alias, Copy Name, Open Main Search

**Default Shortcuts**:
- `Cmd+R` - Refresh Resources
- `Cmd+F` - Toggle Favorite
- `Cmd+C` - Copy URL
- `Cmd+Shift+C` - Copy Address
- `Cmd+Opt+C` - Copy Alias
- `Cmd+Shift+Opt+C` - Copy Resource Name
- `Cmd+O` - Open Main Search
- `Cmd+Shift+X` - Clear All Data
- `Cmd+Shift+D` - Toggle Debug Mode
- `Cmd+Shift+L` - Export Debug Logs

## 🎯 Usage

### Search Resources Command
- **Launch**: Type "Search Resources" in Raycast
- **Search**: Type to filter by name, address, network, or alias
- **Multi-term**: Use multiple words for refined searches
- **Access**: Press Enter to open resource in browser
- **Favorites**: `Cmd+F` to mark/unmark favorites
- **Copy**: Various copy shortcuts for different resource properties

### Recent Resources Command
- **Launch**: Type "Recent Resources" in Raycast
- **View History**: See chronologically sorted recent access
- **Quick Access**: Resources show last accessed time
- **Open Main Search**: `Cmd+O` to search for specific resource
- **Favorites**: Mark recent resources as favorites (maintains chronological order)

### Debug Features
- **Toggle Debug**: `Cmd+Shift+D` on any resource
- **Export Logs**: `Cmd+Shift+L` to copy logs to clipboard
- **Performance Monitoring**: Track API calls, cache hits, and response times
- **Session-based**: Debug mode resets between Raycast sessions

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Raycast installed

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

### Project Structure
```
src/
├── api/                 # Twingate API integration
│   └── twingate.ts     # GraphQL client and queries
├── components/         # Shared React components
│   └── ResourceListItem.tsx
├── hooks/             # Custom React hooks
│   └── useFavorites.ts
├── utils/             # Utility functions
│   ├── storage.ts     # Local storage management
│   ├── debug.ts       # Debug logging system
│   └── shortcuts.ts   # Shortcut parsing utilities
├── types.ts           # TypeScript type definitions
├── search-resources.tsx # Main search command
└── recent-resources.tsx # Recent resources command
```

### Architecture

**Data Flow**:
1. **API Layer** (`api/twingate.ts`) - GraphQL queries to Twingate API
2. **Storage Layer** (`utils/storage.ts`) - LocalStorage for favorites/recent
3. **Components** - Shared UI components with props
4. **Commands** - Individual Raycast commands
5. **Hooks** - Shared state management (favorites, caching)

**Key Patterns**:
- **Cached Promises**: Using `@raycast/utils` for API caching
- **Shared Components**: DRY principle with ResourceListItem
- **Preference Integration**: Native Raycast settings
- **Debug System**: Comprehensive logging with export capabilities

## 🧪 Testing

### Manual Testing
1. **Search Functionality**: Test multi-term search across all fields
2. **Favorites**: Add/remove favorites, verify sorting behavior
3. **Recent Resources**: Access resources, verify timestamp updates
4. **Shortcuts**: Test all keyboard shortcuts work correctly
5. **Debug Mode**: Enable debug, perform actions, export logs
6. **Preferences**: Modify shortcuts, verify they take effect

### API Testing
```bash
# Test API connectivity
npm run dev
# Use debug mode to monitor API calls
```

## 📋 Commands

| Command | Description | Default Shortcut |
|---------|-------------|------------------|
| Search Resources | Browse and search all Twingate resources | - |
| Recent Resources | View recently accessed resources | - |

## 🤝 Contributing

### Guidelines
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Strict typing required
- **ESLint**: Follow the configured rules
- **Prettier**: Use for code formatting
- **Components**: Use functional components with hooks
- **Error Handling**: Comprehensive error handling with user feedback

### Debug Information
When reporting issues, please include:
1. **Raycast version**
2. **Extension version**
3. **Debug logs** (export via `Cmd+Shift+L`)
4. **Steps to reproduce**
5. **Expected vs actual behavior**

## 🔒 Security

- **API Keys**: Stored securely in Raycast preferences
- **Local Storage**: Only non-sensitive data (favorites, recent resources)
- **Network**: All communication over HTTPS
- **No Telemetry**: No usage tracking or data collection

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**"Failed to Load Resources"**
- Verify API key is correct
- Check network URL format (`https://company.twingate.com`)
- Ensure API key has proper permissions

**"No Resources Found"**
- Try broader search terms
- Check if resources exist in Twingate admin console
- Verify you have access to resources

**Shortcuts Not Working**
- Check shortcut format in preferences (`cmd+shift+c`)
- Avoid conflicts with system shortcuts
- Use supported modifiers: `cmd`, `ctrl`, `opt`, `shift`

### Getting Help
1. **Enable Debug Mode** (`Cmd+Shift+D`)
2. **Reproduce the issue**
3. **Export Debug Logs** (`Cmd+Shift+L`)
4. **Create an issue** with logs and steps to reproduce

---

**Built with ❤️ for the Raycast community** 