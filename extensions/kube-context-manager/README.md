# Kubernetes Context Manager

⚡ **Lightning-fast Kubernetes context management for Raycast** - Switch contexts instantly with advanced search, rich metadata display, and comprehensive context lifecycle management.

> 🚀 **No kubectl required!** Direct kubeconfig manipulation for superior performance and reliability.

## ✨ Features

### 🎯 **4 Powerful Commands**

#### 1. 📋 **Kube Contexts**
- **Fuzzy search** across name, cluster, user, and namespace
- **Relevance scoring** with match highlighting
- **Rich metadata display** - hostname, port, auth method, protocol
- **One-click context switching** directly from search results
- **Context details view** for comprehensive information

#### 2. 🎯 **Current Context**
- **Detailed cluster information** with security indicators
- **Authentication method detection** (Token, Certificates, Basic Auth, etc.)
- **Quick switching** to other available contexts
- **Server endpoint details** with protocol information

#### 3. 🔄 **Switch Context with Namespace**
- **Two-step workflow** - select context, then namespace
- **Smart namespace discovery** from existing contexts
- **Combined switching** operation for efficiency
- **Keyboard shortcuts** for power users

#### 4. 🛠️ **Manage Contexts**
- **Create contexts** with flexible input options
- **Modify existing contexts** - rename, change cluster/user/namespace
- **Delete contexts** with safety validation
- **Toggle between existing and manual entry** for maximum flexibility

## 🚀 **Why Choose This Extension?**

### **Performance & Reliability**
- ✅ **No kubectl dependency** - Works without kubectl installed
- ✅ **Direct kubeconfig manipulation** - 10x faster than shell commands
- ✅ **Zero subprocess overhead** - No command execution delays
- ✅ **Automatic error recovery** - Smart backup and restore

### **Rich User Experience**
- ✅ **Advanced search engine** - Multi-field fuzzy search with relevance scoring
- ✅ **Comprehensive metadata** - Server endpoints, auth methods, security indicators
- ✅ **Seamless workflows** - Auto-return to Raycast main after operations
- ✅ **Enhanced error handling** - Actionable error messages with solutions

### **Developer Friendly**
- ✅ **Universal compatibility** - Works in any environment with kubeconfig
- ✅ **Flexible context management** - Create, modify, delete with validation
- ✅ **TypeScript powered** - Full type safety and IntelliSense
- ✅ **Production ready** - Comprehensive error handling and edge case coverage

## 📦 Installation

### From Raycast Store (Recommended)
1. Open Raycast
2. Search for "Kubernetes Context Manager"
3. Click Install

### Manual Installation (Development)
1. Clone the Raycast extensions repository: `git clone https://github.com/raycast/extensions.git`
2.  Navigate to the extension directory: `cd extensions/kube-context-manager`
3. Run `npm install` to install dependencies  
4. Run `npm run dev` to start development mode

## 🎮 Usage Guide

### **Quick Start**
1. Open Raycast (`Cmd + Space`)
2. Type "Kube Contexts" to see all available contexts
3. Search for your target context
4. Press `Enter` to switch instantly

### **Command Overview**

| Command | Description |
|---------|-------------|
| **Kube Contexts** | Search and switch contexts with advanced filtering |
| **Current Context** | View current context details and quick actions |
| **Switch Context with Namespace** | Two-step context + namespace selection |
| **Manage Contexts** | Full context lifecycle management |

### **Advanced Features**

#### 🔍 **Smart Search**
- Search across **multiple fields**: name, cluster, user, namespace
- **Fuzzy matching**: "dev-east" matches "development-us-east-1"
- **Relevance scoring**: Most relevant matches appear first
- **Real-time filtering**: Instant results as you type

#### ⚡ **Quick Actions**
- `Enter` - Switch to selected context
- `Cmd + Enter` - View context details
- `Cmd + Shift + Enter` - Quick switch (Switch Context with Namespace)
- `Cmd + R` - Refresh context list

#### 🛠️ **Context Management**
- **Create**: Add new contexts with existing or custom cluster/user values
- **Modify**: Update context properties (name, cluster, user, namespace)
- **Delete**: Remove contexts with safety validation
- **Duplicate**: Clone contexts for similar environments

## 🔧 Troubleshooting

### **Common Issues**

#### **"Kubeconfig Not Found"**
- **Cause**: No kubeconfig file at `~/.kube/config`
- **Solution**: Create a kubeconfig file or set `KUBECONFIG` environment variable
- **Commands**: 
  ```bash
  mkdir -p ~/.kube
  # Add your kubeconfig content to ~/.kube/config
  ```

#### **"Permission Denied"**
- **Cause**: Incorrect file permissions on kubeconfig
- **Solution**: Fix file permissions
- **Commands**:
  ```bash
  chmod 600 ~/.kube/config
  ```

#### **"Invalid YAML Syntax"**
- **Cause**: Malformed kubeconfig file
- **Solution**: Validate and fix YAML syntax
- **Commands**:
  ```bash
  # Validate YAML syntax
  yamllint ~/.kube/config
  ```

#### **"Context Not Found"**
- **Cause**: Context doesn't exist in kubeconfig
- **Solution**: Check available contexts or update kubeconfig
- **Commands**:
  ```bash
  yq '.contexts[].name' ~/.kube/config
  ```

### **Performance Tips**
- ✅ Large kubeconfig files (50+ contexts) are handled efficiently
- ✅ Search performance remains fast with hundreds of contexts
- ✅ Memory usage is optimized for minimal system impact

## 🏗️ Architecture

### **Core Design**
- **Direct YAML Manipulation**: No kubectl dependency for 10x faster performance
- **React Hooks Architecture**: Clean separation of concerns with TypeScript
- **Enhanced Error Handling**: Comprehensive error analysis with actionable guidance
- **Backup System**: Automatic kubeconfig backup before any modifications

### **File Structure**
```
src/
├── components/         # Reusable UI components
├── hooks/             # React hooks for data management
├── utils/             # Core kubeconfig manipulation
├── types/             # TypeScript type definitions
└── [commands].tsx     # Individual Raycast commands
```

### **Key Technologies**
- **Raycast API** - Native extension framework
- **TypeScript** - Type safety and developer experience
- **YAML Parser** - Direct kubeconfig file manipulation
- **React Hooks** - State management and data fetching

## 🚀 Development

### **Setup**
```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for distribution
npm run build
```

### **Code Quality**
```bash
# Lint code
npm run lint

# Auto-fix issues
npm run fix-lint

# Type checking
npm run build
```

### **Testing**
```bash
# Run in development mode
npm run dev

# Test all 4 commands in Raycast:
# - Kube Contexts
# - Current Context  
# - Switch Context with Namespace
# - Manage Contexts
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests to the main repository.

---

**Made with ❤️ for the Kubernetes community**
