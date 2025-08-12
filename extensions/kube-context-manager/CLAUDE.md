# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **production-ready** Raycast extension for managing Kubernetes contexts. The extension uses direct kubeconfig file manipulation for superior performance and reliability.

## ✅ Current Status: PRODUCTION READY EXTENSION

**Core Features Implemented:**
- ✅ Enhanced context listing with fuzzy search and relevance scoring
- ✅ Direct context switching (actually works!)
- ✅ Rich cluster metadata display (server endpoints, auth methods, security info)
- ✅ Namespace selection within context switching
- ✅ Current context detection with detailed information
- ✅ Real-time kubeconfig file monitoring
- ✅ Advanced error handling and user feedback
- ✅ Multi-field search (name, cluster, user, namespace)
- ✅ Complete context lifecycle management (create, modify, delete)

## Architecture Overview

### **Direct Kubeconfig Approach** (Primary - PRODUCTION READY)
- **`src/utils/kubeconfig-direct.ts`** - Direct YAML file manipulation with enhanced cluster metadata
- **`src/hooks/useKubeconfig.ts`** - React hooks for kubeconfig operations
- **`src/utils/search-filter.ts`** - Advanced search and filtering engine
- **`src/components/NamespaceSelector.tsx`** - Reusable namespace selection UI
- **`src/components/ContextDetails.tsx`** - Comprehensive context details display

**Key Benefits:**
- **No kubectl dependency** - Works without kubectl installed
- **No PATH issues** - Direct file operations bypass shell/PATH problems
- **Faster & More Reliable** - No subprocess overhead or execution failures
- **Rich Metadata** - Extracts detailed cluster and authentication information

## Development Commands

- `npm run dev` - Development mode with hot reloading ✅ **WORKING**
- `npm run build` - Build the extension for distribution ✅ **WORKING**
- `npm run lint` - Code linting  
- `npm run fix-lint` - Auto-fix linting issues
- `npm run publish` - Publish to Raycast Store

## Key Files Structure

```
src/
├── components/
│   ├── NamespaceSelector.tsx     # Reusable namespace selection UI
│   └── ContextDetails.tsx        # Comprehensive context details display
├── hooks/
│   └── useKubeconfig.ts          # React hooks for kubeconfig operations
├── utils/
│   ├── kubeconfig-direct.ts      # Direct kubeconfig file manipulation (PRIMARY)
│   ├── search-filter.ts          # Advanced search and filtering engine
│   └── errors.ts                 # Error handling and user feedback
├── types/
│   └── index.ts                  # TypeScript interfaces with enhanced metadata
├── list-contexts.tsx             # Enhanced context listing with fuzzy search and switching
├── current-context.tsx           # Current context display with rich cluster info
├── switch-context-namespace.tsx  # Context switching with namespace selection
└── manage-contexts.tsx           # Context creation, modification, and deletion
```

## Dependencies

**Core Dependencies:**
- `@raycast/api` - Raycast extension API
- `@raycast/utils` - Raycast utility functions
- `yaml` - **CRITICAL** - For kubeconfig YAML parsing
- `@types/js-yaml` - TypeScript definitions

## How It Works

### **Kubeconfig Direct Approach** (Production Implementation)
1. **Read**: `~/.kube/config` file directly using Node.js `fs`
2. **Parse**: YAML content using `yaml` library with enhanced metadata extraction
3. **Enhance**: Extract cluster details (server, hostname, port, protocol, security)
4. **Authenticate**: Detect authentication methods (token, certificates, basic auth, exec, etc.)
5. **Manipulate**: JavaScript objects for context operations
6. **Write**: Modified YAML back to file for context switching
7. **No shell commands** - completely bypasses kubectl execution

### **Key Functions:**
- `getAllContexts()` - Get all contexts with enhanced metadata
- `getCurrentContext()` - Get active context
- `switchToContext(name)` - Switch to different context ✅ **WORKS**
- `switchToContextWithNamespace()` - Switch context and set namespace
- `setContextNamespace(ctx, ns)` - Set namespace for context
- `getClusterDetails(name)` - Extract rich cluster metadata
- `getUserAuthMethod(name)` - Detect authentication method
- `searchAndFilterContexts()` - Advanced multi-field search with fuzzy matching
- `getAllAvailableNamespaces()` - Smart namespace discovery
- `createContext()` - Create new contexts with validation
- `modifyContext()` - Update existing context properties
- `deleteContext()` - Remove contexts with safety checks

## Production Commands Available

### 4 Streamlined Commands:
1. **"List Contexts"** - ⚡ Enhanced context listing with:
   - Fuzzy search across name, cluster, user, namespace
   - Relevance scoring and match highlighting  
   - Rich metadata display (hostname, port, auth method, protocol)
   - Direct context switching from search results
   - Current context indicators
   - **"View Details" action** for comprehensive context information

2. **"Current Context"** - 📋 Comprehensive current context display with:
   - Detailed cluster information (server, hostname, port, protocol)
   - Authentication method detection
   - Security indicators (TLS, CA certificates)
   - Quick switching to other contexts

3. **"Switch Context with Namespace"** - 🔄 Two-step workflow:
   - Context selection with enhanced metadata
   - Namespace selection for chosen context
   - Combined switching operation

4. **"Manage Contexts"** - 🛠️ Complete context lifecycle management:
   - **Flexible context creation** with existing or manual entry options
   - **Toggle-based forms** - Choose between existing clusters/users or input custom values
   - **Manual input support** - Custom cluster names, server URLs, and usernames
   - **Automatic resource creation** - Creates cluster/user entries if they don't exist
   - Modify existing context properties (name, cluster, user, namespace)
   - Delete contexts with safety validation
   - Form-based interface with real-time validation
   - **"View Details" action** for each context

## Development Status

### ✅ **COMPLETED FEATURES:**
- **Foundation Setup**: Project structure, kubeconfig integration
- **Core Features**: Context listing, switching, current context display  
- **Enhanced Features**: Complete namespace management and advanced search functionality
- **Rich Metadata**: Cluster details, authentication methods, security indicators
- **Clean Codebase**: All kubectl references removed, no duplicate files
- **Production Ready**: 4 streamlined commands covering all essential workflows including context lifecycle management

### **What Works Perfectly:**
- ✅ Direct kubeconfig file manipulation with rich metadata extraction
- ✅ Context switching via keyboard shortcuts and direct actions
- ✅ Real-time context detection and kubeconfig monitoring
- ✅ Advanced fuzzy search with multi-field matching and relevance scoring
- ✅ Comprehensive cluster information display
- ✅ Authentication method detection (Token, Client Certificate, Basic Auth, Exec, etc.)
- ✅ Security indicators (HTTPS/HTTP, TLS validation, CA certificates)
- ✅ Namespace management and selection
- ✅ **Universal context details view** - Available from all context listing commands
- ✅ **Rich context information display** with markdown formatting and metadata sidebar
- ✅ **Auto-close after context switching** - Returns to main Raycast search bar after switching contexts
- ✅ **Seamless workflow integration** - Switch contexts and continue with normal Raycast usage
- ✅ Enhanced error handling with user-friendly messages
- ✅ TypeScript type safety with enhanced interfaces
- ✅ Complete context lifecycle management (CRUD operations)

### **Architecture Advantages:**
- **Reliable**: No subprocess failures or PATH issues
- **Fast**: No command execution overhead  
- **Secure**: No shell injection risks, direct file operations
- **Independent**: Works without kubectl installation
- **Rich**: Extracts comprehensive metadata from kubeconfig
- **User-Friendly**: Enhanced UX with detailed information and smooth workflows

## Security and Reliability

### **Security Features:**
- Direct file operations (no shell execution)
- Input validation for all kubeconfig operations
- Safe YAML parsing with comprehensive error handling
- No external command dependencies
- Secure cluster connection validation
- Automatic kubeconfig backup before modifications

### **Reliability Features:**
- Graceful error handling for missing kubeconfig files
- File permission validation
- YAML format validation and recovery
- User-friendly error messages with troubleshooting guidance
- Real-time file monitoring and updates
- Enhanced error analysis with actionable guidance

## Error Handling System

### **Enhanced Error Types:**
- **File System Errors**: Missing kubeconfig, permission denied
- **YAML Parsing Errors**: Invalid syntax, malformed structure
- **Context Errors**: Context not found, already exists
- **Network Errors**: Connection timeouts, cluster unreachable
- **Validation Errors**: Invalid input, missing required fields

### **User Experience:**
- **Actionable Error Messages**: Each error provides specific resolution steps
- **Toast Notifications**: Success/error feedback with clear messaging
- **Backup System**: Automatic kubeconfig backup before any modifications
- **Recovery Options**: Graceful fallback and error recovery

## Development Philosophy

**BREAKTHROUGH SOLUTION**: Direct kubeconfig manipulation with enhanced metadata extraction provides:
- **Superior Performance**: No kubectl dependency or command execution overhead
- **Rich User Experience**: Comprehensive cluster and authentication information
- **Universal Compatibility**: Works in any environment with kubeconfig
- **Production Reliability**: Robust error handling and type safety
- **Advanced Search**: Multi-field fuzzy search with intelligent relevance scoring

The extension is **production-ready and feature-complete** for comprehensive Kubernetes context management workflows.

## Code Quality Standards

- **TypeScript Strict Mode**: Full type safety enforcement
- **ESLint Configuration**: Comprehensive linting rules
- **Prettier Formatting**: Consistent code formatting
- **No `any` types**: Proper TypeScript typing throughout
- **Error Handling**: Comprehensive error analysis and user feedback
- **Performance Optimized**: Efficient algorithms and minimal dependencies

## Testing Approach

- **Manual Testing**: All 4 commands tested in development
- **Edge Case Handling**: No kubeconfig, empty files, permission errors
- **Performance Testing**: Large kubeconfig files with 50+ contexts
- **User Workflow Validation**: Complete end-to-end workflows tested
- **Error Recovery**: All error scenarios tested with proper user guidance