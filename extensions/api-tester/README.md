# API Tester

Test APIs with a lightweight Postman alternative built directly into Raycast. Send HTTP requests, manage collections, and inspect responses - all without leaving your keyboard.

## Features

### 🌐 HTTP Methods
Send requests using all major HTTP methods:
- **GET** - Retrieve data
- **POST** - Create resources  
- **PUT** - Update resources
- **DELETE** - Remove resources
- **PATCH** - Partial updates

### 🔐 Authentication
Multiple authentication methods supported:
- **Bearer Token** - JWT and OAuth tokens
- **API Key** - Header or query parameter
- **Basic Auth** - Username and password
- **Custom Headers** - Full control

### 📦 Request Body Types
- **JSON** - Application/json with syntax validation
- **Form Data** - Multipart/form-data with file upload support
- **URL Encoded** - Application/x-www-form-urlencoded
- **Raw** - Plain text or custom content

### 📚 Collections
Organize your API requests:
- Create and manage collections
- Group related endpoints
- Import/Export collections as JSON
- Quick search and filtering

### 🕒 Request History
Never lose a request:
- Automatic request tracking
- Replay past requests instantly
- View detailed request/response data
- Configurable history limit

### 🌍 Environment Variables
Multi-environment support:
- Create unlimited environments (Dev, Staging, Production)
- Variable substitution with `{{variableName}}`
- Switch environments with one click
- Use variables in URLs, headers, and body

### 🎨 Response Inspector
Beautiful response viewing:
- Syntax-highlighted JSON
- Response metrics (status, time, size)
- Color-coded status codes
- Copy to clipboard
- Export responses

### 💻 Code Generation
Generate code snippets from your requests:
- **cURL** - Command-line ready
- **JavaScript fetch** - Modern browser API
- **Axios** - Popular HTTP client

## Quick Start

### Your First Request

1. Open Raycast and type "Send Request"
2. Fill in the form:
   - **Method**: GET
   - **URL**: `https://api.github.com/users/octocat`
3. Press `Cmd+Enter` to send
4. View the response!

### Using Collections

1. Open "Manage Collections"
2. Create a new collection (e.g., "GitHub API")
3. Add your requests to organize them
4. Export/Import collections as JSON

### Environment Variables

1. Open "Manage Environments"
2. Create an environment (e.g., "Development")
3. Add variables:
   ```
   BASE_URL=https://api.dev.example.com
   API_KEY=your-dev-key
   ```
4. Use in requests: `{{BASE_URL}}/users`
5. Switch environments to change all variables at once

## Examples

### Simple GET Request
```
Method: GET
URL: https://api.github.com/users/octocat
```

### POST with Bearer Token
```
Method: POST
URL: https://api.example.com/users
Auth: Bearer Token
Token: your-jwt-token
Body (JSON): {"name": "John Doe", "email": "john@example.com"}
```

### File Upload
```
Method: POST
URL: https://api.example.com/upload
Body Type: Form Data
Fields:
  - file: [Select file using file picker]
  - description: "My uploaded file"
```

### Using Environment Variables
```
Method: GET
URL: {{BASE_URL}}/users/{{USER_ID}}
Headers: 
  X-API-Key: {{API_KEY}}
```

## Keyboard Shortcuts

### Send Request
- `Cmd+Enter` - Send request
- `Cmd+C` - Copy response body
- `Cmd+Shift+C` - Copy formatted JSON
- `Cmd+G` - Copy as code (cURL, fetch, axios)

### Collections
- `Cmd+N` - Create new collection
- `Cmd+E` - Edit collection
- `Cmd+Shift+E` - Export collection
- `Cmd+I` - Import from clipboard
- `Ctrl+D` - Delete collection

### History
- `Enter` - View request details
- `Cmd+R` - Replay request
- `Ctrl+Shift+X` - Clear all history

## Preferences

Configure the extension to your needs:

- **Request Timeout** - Default timeout in milliseconds (default: 30000)
- **Max History Items** - Maximum number of requests to keep in history (default: 50)

## Why API Tester?

### vs. Postman
✅ Lightweight - No heavy desktop app  
✅ Fast - Instant access via Raycast  
✅ Keyboard-first - Optimized for developers  
✅ Privacy - All data stored locally  
✅ Free - No subscription required

### vs. cURL
✅ Visual - Beautiful UI instead of terminal  
✅ History - Automatic request tracking  
✅ Collections - Organize requests  
✅ Variables - Environment support  
✅ Code Generation - Export to cURL when needed

## Technical Details

- **Storage**: All data stored locally using Raycast LocalStorage
- **HTTP Client**: Built on node-fetch for reliable requests
- **File Uploads**: Full multipart/form-data support with file picker
- **Variables**: Real-time variable substitution in URLs, headers, and body
- **Export/Import**: JSON format for easy sharing and backup

## Support

If you encounter any issues or have feature requests:
- Check the built-in help and examples
- Review your request configuration
- Ensure environment variables are properly set
- Verify API endpoints are accessible

## License

MIT License - see [LICENSE](LICENSE) file for full details.

---

**Happy API Testing! 🚀**
