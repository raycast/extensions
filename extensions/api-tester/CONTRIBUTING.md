# Contributing to API Tester

Thank you for your interest in contributing to API Tester! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- **Clear title** - Describe the bug concisely
- **Steps to reproduce** - How to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Raycast version, extension version
- **Screenshots** - If applicable

### Suggesting Features

We love feature suggestions! Please create an issue with:

- **Feature description** - What you'd like to see
- **Use case** - Why this feature would be useful
- **Examples** - Similar features in other tools
- **Priority** - How important is this to you

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Create a Pull Request**

## 📋 Development Guidelines

### Code Style

- **TypeScript** - Use TypeScript for type safety
- **Formatting** - Run `npm run fix-lint` before committing
- **Naming** - Use descriptive variable and function names
- **Comments** - Add comments for complex logic

### Project Structure

```
src/
├── types.ts              # Type definitions (HTTP methods, auth, body types)
├── storage.ts            # LocalStorage utilities (collections, history, environments)
├── utils.ts              # Helper functions (formatting, validation, variables)
├── api.ts                # HTTP client (fetch wrapper, file upload support)
├── codegen.ts            # Code generation (cURL, fetch, axios)
├── import-export.ts      # Collection import/export functionality
├── new-request.tsx       # Send Request command (main form)
├── collections.tsx       # Collections management (CRUD operations)
├── history.tsx           # Request history (view, replay, clear)
└── environments.tsx      # Environment variables (multi-environment support)
```

### Key Files Explained

**types.ts** - All TypeScript interfaces and types:
- `HttpMethod`, `AuthType`, `BodyType`
- `ApiRequest`, `ApiResponse`
- `Collection`, `Environment`, `RequestHistory`
- `KeyValue` (for headers, params, form fields)

**storage.ts** - LocalStorage operations:
- `getCollections()`, `saveCollections()`
- `getHistory()`, `addToHistory()`
- `getEnvironments()`, `getActiveEnvironment()`

**api.ts** - HTTP request handling:
- `sendRequest()` - Main function to send HTTP requests
- Supports all auth types and body types
- File upload with FormData
- Variable substitution

**codegen.ts** - Code generation:
- `generateCurl()` - Generate cURL commands
- `generateFetch()` - Generate JavaScript fetch code
- `generateAxios()` - Generate Axios code

**import-export.ts** - Collection management:
- `exportCollections()` - Export all collections to JSON
- `exportCollection()` - Export single collection
- `importCollections()` - Import from JSON with validation

### Adding a New Feature

1. **Plan the feature**
   - Define the use case
   - Check if it fits the extension's scope
   - Consider UI/UX implications

2. **Update types** - Add new types in `types.ts`
   ```typescript
   // Example: Adding a new auth type
   export type AuthType = "none" | "bearer" | "apikey" | "basic" | "oauth";
   ```

3. **Add storage functions** - If needed in `storage.ts`
   ```typescript
   // Example: New storage function
   export async function getSettings() {
     return await LocalStorage.getItem<Settings>("settings");
   }
   ```

4. **Implement core logic** - In appropriate file (`api.ts`, `utils.ts`, etc.)
   ```typescript
   // Example: New authentication handler
   if (auth.type === "oauth" && auth.oauth) {
     headers["Authorization"] = `Bearer ${auth.oauth.token}`;
   }
   ```

5. **Create UI components** - In appropriate `.tsx` file
   ```typescript
   // Example: New form field
   {authType === "oauth" && (
     <Form.TextField id="oauth_token" title="OAuth Token" />
   )}
   ```

6. **Update documentation**
   - README.md - User-facing documentation
   - docs/FEATURES.md - Feature list
   - CHANGELOG.md - Version history
   - docs/EXAMPLES.md - Usage examples

7. **Test thoroughly**
   - Test on both Windows and macOS if possible
   - Test in light and dark themes
   - Test error scenarios
   - Test with real APIs

### Testing Checklist

Before submitting a PR, ensure:

- [ ] Code compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript types are correct (no `any` unless necessary)
- [ ] Feature works as expected in dev mode (`npm run dev`)
- [ ] Tested all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- [ ] Tested with different auth types
- [ ] Tested with different body types
- [ ] Tested error scenarios (network errors, timeouts, invalid data)
- [ ] Tested in both light and dark themes
- [ ] No breaking changes (or documented in CHANGELOG.md)
- [ ] Documentation updated (README, FEATURES, EXAMPLES)
- [ ] No console.log statements left in code
- [ ] Tested on Windows/macOS (if possible)

## 🎨 UI/UX Guidelines

### Raycast Design Principles

- **Keyboard-first** - Everything should be accessible via keyboard
- **Fast** - Minimize loading times and delays
- **Clear** - Use clear labels and descriptions
- **Consistent** - Follow Raycast's design patterns
- **Helpful** - Provide helpful error messages

### Icons and Colors

Use Raycast's built-in icons and colors:

- **HTTP Methods**:
  - GET - Green
  - POST - Blue
  - PUT - Orange
  - DELETE - Red
  - PATCH - Purple
- **Status Codes**:
  - 2xx - Green (🟢)
  - 3xx - Blue (🔵)
  - 4xx - Yellow (🟡)
  - 5xx - Red (🔴)

## 📝 Documentation

### What to Document

- **New features** - Add to docs/FEATURES.md
- **Breaking changes** - Update CHANGELOG.md
- **API changes** - Update docs/DEVELOPMENT.md
- **Usage examples** - Add to docs/QUICKSTART.md

### Documentation Style

- Use **clear headings**
- Include **code examples**
- Add **screenshots** when helpful
- Keep it **concise** but **complete**

## 🐛 Debugging

### Common Issues

**Extension not loading**
- Run `npm run dev` to start development mode
- Check Raycast console for errors (Cmd+Shift+D in Raycast)
- Ensure all dependencies are installed (`npm install`)
- Check for TypeScript errors

**TypeScript errors**
- Run `npm run lint` to see all errors
- Check `tsconfig.json` settings
- Ensure types are imported correctly
- Use `--skip-types` flag if needed for build

**Storage issues**
- Clear LocalStorage via Raycast preferences
- Check storage key names match constants
- Verify JSON serialization/deserialization
- Check for data migration issues

**Form validation issues**
- Raycast Forms don't accept `<div>` elements
- Use arrays or fragments for multiple form items
- Each form item needs a unique `id`
- File picker returns array of paths

**API request issues**
- Check network connectivity
- Verify URL format (must include protocol)
- Check authentication credentials
- Test with simple GET request first
- Check CORS if testing local APIs

### Debug Tips

- Use `console.log()` for debugging (check Raycast console)
- Use `showToast()` for user-facing messages
- Check Raycast's developer console (Cmd+Shift+D)
- Test with simple requests first (e.g., https://httpbin.org)
- Use TypeScript's type checking to catch errors early
- Test error scenarios (invalid URL, timeout, network error)
- Use `getDiagnostics` to check for code issues

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backwards compatible)
- **PATCH** - Bug fixes

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Test all features
4. Create git tag
5. Push to repository
6. Publish to Raycast store

## ✅ Current Features (v1.0.0)

The extension currently includes:

### Core Features
- ✅ **HTTP Methods** - GET, POST, PUT, DELETE, PATCH
- ✅ **Authentication** - Bearer Token, API Key, Basic Auth, Custom Headers
- ✅ **Request Body Types**:
  - JSON with syntax validation
  - Form Data (multipart/form-data)
  - URL Encoded (application/x-www-form-urlencoded)
  - Raw text
- ✅ **File Upload** - File picker integration with multipart support
- ✅ **Collections** - Create, edit, delete, organize requests
- ✅ **Import/Export** - Collections as JSON format
- ✅ **Environment Variables** - Multi-environment support with variable substitution
- ✅ **Request History** - Automatic tracking with replay functionality
- ✅ **Code Generation** - cURL, JavaScript fetch, Axios
- ✅ **Response Inspector** - Syntax-highlighted JSON, metrics, headers

### UI Features
- ✅ Color-coded HTTP methods
- ✅ Status code indicators
- ✅ Keyboard shortcuts
- ✅ Search and filtering
- ✅ Light/dark theme support

## 💡 Feature Ideas

Looking for something to work on? Here are some ideas:

### High Priority

- [ ] GraphQL support (queries, mutations, subscriptions)
- [ ] WebSocket testing
- [ ] Request chaining (use response from one request in another)
- [ ] Test scripts (pre-request and post-request scripts)
- [ ] Response assertions and validation

### Medium Priority

- [ ] Mock servers
- [ ] Response diff viewer (compare responses)
- [ ] Bulk operations (send multiple requests)
- [ ] Request templates
- [ ] Custom authentication flows (OAuth 2.0)

### Low Priority

- [ ] Cloud sync (sync collections across devices)
- [ ] Team collaboration features
- [ ] API documentation generator
- [ ] Performance testing (load testing)
- [ ] Request scheduling

## 🎯 Code Review Process

### What We Look For

- **Functionality** - Does it work as intended?
- **Code quality** - Is it clean and maintainable?
- **Performance** - Is it efficient?
- **Documentation** - Is it well documented?
- **Testing** - Has it been tested?

### Review Timeline

- We aim to review PRs within **3-5 days**
- Complex PRs may take longer
- We'll provide feedback and suggestions
- Be patient and responsive to feedback

## 🙏 Recognition

Contributors will be:

- Listed in the README
- Mentioned in release notes
- Credited in the extension store listing

## 📞 Getting Help

Need help contributing?

- Create an issue with your question
- Check existing documentation
- Look at similar features for examples

## 🛠️ Tech Stack

### Dependencies

**Runtime:**
- `@raycast/api` (^1.65.0) - Raycast extension API
- `@raycast/utils` (^1.12.0) - Utility functions
- `node-fetch` (^3.3.2) - HTTP client for making requests
- `form-data` (^4.0.5) - Multipart form-data support for file uploads

**Development:**
- `typescript` (^5.2.2) - Type-safe development
- `@types/node` (20.8.10) - Node.js type definitions
- `@types/react` (18.2.27) - React type definitions
- `eslint` (^8.51.0) - Code linting
- `prettier` (^3.0.3) - Code formatting

### Key Technologies

**Raycast API:**
- `Form` - Input forms with validation
- `List` - Searchable lists with actions
- `Detail` - Rich content display
- `ActionPanel` - Keyboard shortcuts and actions
- `LocalStorage` - Persistent data storage
- `showToast` - User notifications

**TypeScript:**
- Strict type checking enabled
- Interface-based architecture
- Type-safe storage operations
- Generic utility functions

**React:**
- Functional components with hooks
- `useState` for local state
- `useEffect` for side effects
- `useNavigation` for navigation

## 📦 Adding Dependencies

Before adding a new dependency:

1. **Check if it's necessary** - Can you implement it yourself?
2. **Check bundle size** - Keep the extension lightweight
3. **Check compatibility** - Works with Raycast's Node.js version
4. **Update package.json** - Add to dependencies or devDependencies
5. **Document usage** - Explain why it's needed

Example:
```bash
# Add runtime dependency
npm install package-name

# Add dev dependency
npm install --save-dev package-name
```

## 🧪 Testing Guidelines

### Manual Testing

Test these scenarios before submitting:

**HTTP Methods:**
- [ ] GET request to public API
- [ ] POST request with JSON body
- [ ] PUT request with authentication
- [ ] DELETE request
- [ ] PATCH request

**Authentication:**
- [ ] Bearer token
- [ ] API key (header and query)
- [ ] Basic auth
- [ ] No auth

**Body Types:**
- [ ] JSON (valid and invalid)
- [ ] Form data (text fields)
- [ ] Form data (file upload)
- [ ] URL encoded
- [ ] Raw text

**Collections:**
- [ ] Create collection
- [ ] Edit collection
- [ ] Delete collection
- [ ] Export collection
- [ ] Import collection

**Environments:**
- [ ] Create environment
- [ ] Add variables
- [ ] Switch environments
- [ ] Use variables in requests

**History:**
- [ ] View history
- [ ] Replay request
- [ ] Clear history

**Edge Cases:**
- [ ] Invalid URL
- [ ] Network timeout
- [ ] Large response (>1MB)
- [ ] Empty response
- [ ] Non-JSON response
- [ ] Special characters in variables

### Test APIs

Use these free APIs for testing:

- **httpbin.org** - HTTP testing service
  - GET: https://httpbin.org/get
  - POST: https://httpbin.org/post
  - Auth: https://httpbin.org/basic-auth/user/pass

- **JSONPlaceholder** - Fake REST API
  - GET: https://jsonplaceholder.typicode.com/posts
  - POST: https://jsonplaceholder.typicode.com/posts

- **GitHub API** - Public API
  - GET: https://api.github.com/users/octocat

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

**This means:**
- ✅ Your contributions can be used, modified, and shared freely
- ✅ Your contributions can be used for commercial purposes
- ✅ You retain attribution for your work
- ✅ The project remains free and open for all use

See [LICENSE](LICENSE) file for full details.

---

Thank you for contributing to API Tester! 🚀
