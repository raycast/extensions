# FlashLarkPost

📨 A powerful Raycast extension for sending quick memos to Lark/Feishu. Supports file attachments, templates, message history, and multiple chat destinations.

## ✨ Features

### 🚀 Core Features
- **One-Action Memo**: Send text to Lark with just `Cmd+Shift+M` → type → `Cmd+Shift+Enter`
- **File Attachments**: Upload images, documents, and videos with native file picker
- **Template System**: Create, manage, and use custom message templates with categories
- **Message History**: View, search, and manage your sent messages with statistics
- **Chat Destinations**: Send to bots, group chats, or personal DMs with easy selection

### 🌍 Platform Support
- **Global & China Support**: Switch between `open.larksuite.com` and `open.feishu.cn` endpoints
- **Multi-language**: Japanese and English interface support
- **Cross-platform**: Works on macOS with Raycast

### 🔧 Advanced Features
- **Custom Chat Management**: Add and manage custom chat destinations
- **Smart Retry**: Exponential backoff for rate limiting (429 errors)
- **Secure Authentication**: App credentials stored securely in Raycast Keychain
- **Optional Timestamps**: Automatically prefix messages with `[YYYY-MM-DD HH:mm:ss]`
- **Native UX**: HUD notifications and native file picker integration

## 🛠️ Installation & Setup

### 1. Create Lark/Feishu App

1. Visit [Lark Developer Console](https://open.larksuite.com/app) or [Feishu Console](https://open.feishu.cn/app)
2. Create a **Custom App**
3. Grant the following permissions:
   - **"Send messages as the app"** (im:message)
   - **"Upload files"** (im:file)
   - **"Get chat info"** (im:chat:readonly)
4. Copy your **App ID** and **App Secret**

### 2. Install Extension

#### Option A: From Raycast Store (Recommended)
1. Open Raycast → **Extensions** → **Store**
2. Search for "Lark Quick Memo"
3. Click **Install**

#### Option B: Development Installation
1. Clone this repository
2. Open Raycast → **Extensions** → **Develop Extensions**
3. Add the project directory

### 3. Configure Extension

1. Open Raycast → **Extensions** → **Lark Quick Memo** → **Configure Extension**
2. Fill in the required settings:
   - **Lark Domain**: `https://open.larksuite.com` (or `https://open.feishu.cn` for China)
   - **App ID**: Your app ID from step 1
   - **App Secret**: Your app secret from step 1
   - **Receive ID Type**: `email` (recommended) or `user_id`
   - **Receive ID**: Your Lark login email or user ID
   - **Prefix Timestamp**: ✅ (optional - adds timestamp to messages)
   - **Language**: Choose between Japanese and English

### 4. Test Installation

1. Press `Cmd+Shift+M` to launch Quick Memo
2. Type a test message
3. Press `Cmd+Shift+Enter` to send
4. Check your Lark DMs for the message

## 📖 Usage Guide

### 🚀 Quick Memo
1. **Launch**: Press `Cmd+Shift+M` or search "Quick Memo" in Raycast
2. **Type**: Enter your message in the text area
3. **Send**: Press `Cmd+Shift+Enter` or click the Send button
4. **Destination**: Use the dropdown to select chat destination (DM, group, bot)

### 📎 File Attachments
1. **Add Files**: Click the "📎 ファイル選択" button or drag & drop files
2. **Supported Formats**: 
   - Images: PNG, JPG, JPEG, GIF, BMP, WebP
   - Documents: PDF, DOC, DOCX, TXT, MD, CSV, XLS, XLSX
   - Videos: MP4, MOV, AVI, MKV, WMV, FLV, WebM (up to 50MB)
3. **Multiple Files**: Select multiple files at once
4. **Preview**: Selected files are shown with remove option

### 📝 Templates
1. **Access**: Click "📝 テンプレート管理" in the main interface
2. **Create**: Click "新しいテンプレート" to create custom templates
3. **Categories**: Organize templates by category (Work, Personal, etc.)
4. **Use**: Select a template from the dropdown to auto-fill message content
5. **Preset Templates**: Includes common templates like meeting notes, daily reports

### 📚 Message History
1. **View**: Click "📚 履歴" to see all sent messages
2. **Search**: Use the search bar to find specific messages
3. **Filter**: Filter by date, destination, or content
4. **Statistics**: View message count and usage statistics
5. **Delete**: Remove individual messages or clear all history

### ⚙️ Settings
1. **Access**: Click "⚙️ 設定" in the main interface
2. **Language**: Switch between Japanese and English
3. **Timestamps**: Enable/disable automatic timestamp prefixes
4. **Custom Chats**: Add frequently used chat destinations
5. **Reset**: Reset templates and settings to defaults

### 🎯 Chat Destinations
- **Personal DM**: Send to yourself (default)
- **Group Chats**: Select from available group conversations
- **Bot Chats**: Send to configured bots
- **Custom**: Add custom chat IDs for frequent destinations

## 🖼️ Screenshots

*Screenshots will be added here showing the main interface, template management, file attachments, and message history.*

## 🏗️ Architecture

```
Raycast Extension → Lark Open API
                 ↓
    tenant_access_token (auth)
                 ↓
    ├── im/v1/messages (send text)
    ├── im/v1/files (upload files)
    ├── im/v1/images (upload images)
    └── im/v1/chats (get chat info)
```

## 📁 Project Structure

```
lark-quick-memo/
├── package.json              # Raycast extension config
├── tsconfig.json             # TypeScript config
└── src/
    ├── quick-memo.tsx        # Main UI component
    ├── lark.ts              # Lark API client (auth, messages, files)
    ├── utils.ts             # Utilities (timestamp, retry, validation)
    ├── template-manager.tsx  # Template management system
    ├── message-history.tsx   # Message history and search
    ├── settings.tsx         # Settings management
    └── types.ts             # TypeScript type definitions
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## ⚙️ Configuration Guide

### Required Permissions
Your Lark app needs these permissions:
- `im:message` - Send messages as the app
- `im:file` - Upload files and images
- `im:chat:readonly` - Get chat information (for destination selection)

### Receive ID Configuration
- **Email (Recommended)**: Use your Lark login email (e.g., `user@company.com`)
- **User ID**: Use Lark user ID (e.g., `ou_xxx`) - found in Lark admin console
- **Chat ID**: For group chats, use chat ID (e.g., `oc_xxx`)

### Domain Configuration
- **Global**: `https://open.larksuite.com` (International users)
- **China**: `https://open.feishu.cn` (China users)

## 🚨 Troubleshooting

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Extension not found** | Raycast can't find the extension | Ensure `package.json` name matches directory |
| **Preferences error** | Settings won't save | Check all required fields are filled correctly |
| **Auth error (401/403)** | "Authentication failed" | Verify App ID/Secret and app permissions |
| **Message not delivered** | No message in Lark | Confirm Receive ID is correct Lark email/ID |
| **File upload fails** | "File upload error" | Check file size (<20MB) and format (PNG/JPG/PDF) |
| **Template not saving** | Templates disappear | Check template name and category are filled |
| **History not loading** | Empty history view | Messages are stored locally, check Raycast storage |

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `234001` | Invalid request param | Check file format and API parameters |
| `99991663` | App token invalid | Regenerate App ID/Secret in Lark console |
| `99991664` | Tenant access token invalid | Check domain configuration |
| `99991665` | User access token invalid | Verify user permissions |

### Debug Steps

1. **Check Extension Logs**:
   - Open Raycast Developer Tools
   - Look for error messages in console

2. **Verify App Configuration**:
   - Ensure app has required permissions
   - Check App ID/Secret are correct
   - Verify domain matches your Lark instance

3. **Test API Access**:
   - Try sending a simple text message first
   - Add file attachments after text works
   - Check network connectivity

4. **Reset Extension**:
   - Clear extension preferences
   - Reconfigure from scratch
   - Restart Raycast if needed

## 🛣️ Roadmap

### ✅ Completed Features
- ✅ **Phase 1**: Basic memo sending with authentication
- ✅ **Phase 2**: File attachments (images and PDFs)
- ✅ **Phase 3**: Template system with categories
- ✅ **Phase 4**: Message history and search
- ✅ **Phase 5**: Chat destination selection
- ✅ **Phase 6**: Multi-language support
- ✅ **Phase 7**: Settings management

### 🚧 Future Enhancements
- **OAuth Support**: Send as user instead of app
- **Rich Text Formatting**: Markdown support in messages
- **Scheduled Messages**: Send messages at specific times
- **Message Reactions**: Add emoji reactions to sent messages
- **Export/Import**: Backup and restore templates/history
- **Keyboard Shortcuts**: Custom shortcuts for templates
- **Message Threading**: Reply to specific messages
- **Batch Operations**: Send to multiple destinations

## 🔧 Development

### Prerequisites
- Node.js 16+ and npm
- Raycast installed on macOS
- Lark/Feishu developer account

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/lark-quick-memo.git
cd lark-quick-memo

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Testing
```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run all checks
npm run check
```

## 📄 License

MIT License - feel free to use and modify!

## 🤝 Contributing

PRs welcome! Please ensure:
- Code follows existing TypeScript patterns
- All features are properly typed
- UI follows Raycast design guidelines
- Add appropriate error handling
- Update documentation for new features

### Development Guidelines
1. Use TypeScript for all new code
2. Follow the existing component structure
3. Add proper error handling and user feedback
4. Test with both global and China Lark instances
5. Ensure multi-language support for new features
6. Maintain TypeScript strict mode compliance
7. Test manually before submitting

---

**Made with ❤️ for the Lark community**