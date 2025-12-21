# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Initial Release

#### Features
- **HTTP Methods**: Support for GET, POST, PUT, DELETE, and PATCH requests
- **Authentication**: Bearer Token, API Key, Basic Auth, and custom headers
- **Request Body Types**: 
  - JSON with syntax validation
  - Form Data (multipart/form-data) with file upload support
  - URL Encoded (application/x-www-form-urlencoded)
  - Raw text
- **Collections Management**: 
  - Create, edit, and delete collections
  - Organize requests by collection
  - Import/Export collections as JSON
- **Request History**: 
  - Automatic tracking of all requests
  - Replay past requests
  - Configurable history limit
  - Clear history option
- **Environment Variables**: 
  - Create multiple environments (Dev, Staging, Production)
  - Variable substitution with `{{variableName}}` syntax
  - Switch between environments
  - Use variables in URLs, headers, and request body
- **Response Inspector**: 
  - Syntax-highlighted JSON responses
  - Response metrics (status code, time, size)
  - Color-coded status indicators
  - Copy response to clipboard
  - View response headers
- **Code Generation**: 
  - Generate cURL commands
  - Generate JavaScript fetch code
  - Generate Axios code
- **File Upload**: 
  - File picker integration
  - Multipart form-data support
  - Multiple file fields support
- **User Interface**: 
  - Clean, intuitive forms
  - Keyboard shortcuts for common actions
  - Search and filter functionality
  - Color-coded HTTP methods

#### Commands
- **Send Request**: Create and send HTTP requests with full configuration
- **Manage Collections**: Organize and manage API request collections
- **Request History**: View and replay past requests
- **Manage Environments**: Create and manage environment variables

#### Preferences
- **Request Timeout**: Configure default timeout (default: 30000ms)
- **Max History Items**: Set maximum history entries (default: 50)
