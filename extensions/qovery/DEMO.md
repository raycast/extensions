# Qovery Services Extension - Demo

## 🎯 Main Features

### 1. Dynamic Credential Configuration

The extension now allows you to dynamically enter your Qovery credentials:

- **API Token**: Your personal authentication token
- **Organization ID**: Your Qovery organization ID

### 2. Secure Storage

- Credentials are stored locally via Raycast's `LocalStorage`
- No credentials are stored in code or configuration files
- You can clear them at any time

### 3. Easy Credential Management

#### First Use

1. Launch the extension
2. A form appears to enter your credentials
3. Fill in the fields and click "Save and Load Services"

#### Changing Credentials

- Use the "Change Credentials" action (⌘ + C)
- Or use the keyboard shortcut from any view

#### Clearing Credentials

- Use the "Clear Credentials" action (destructive action)
- All stored credentials are deleted

## 🔧 Keyboard Shortcuts

- **⌘ + R**: Refresh services list
- **⌘ + C**: Change credentials
- **⌘ + Enter**: Submit credential form

## 📱 User Interface

### Configuration Screen

```
┌─────────────────────────────────────┐
│ Qovery Services                     │
├─────────────────────────────────────┤
│ Qovery API Token                    │
│ [Enter your Qovery API token]       │
│                                     │
│ Organization ID                     │
│ [Enter your Qovery organization ID] │
│                                     │
│ [Save and Load Services] [Clear...] │
└─────────────────────────────────────┘
```

### Services List

```
┌─────────────────────────────────────┐
│ Qovery Services                     │
├─────────────────────────────────────┤
│ 📱 My App • 🟢 Running              │
│    Last updated: 12/01/2024         │
│                                     │
│ 🐳 My Container • 🔴 Stopped        │
│    Last updated: 11/30/2024         │
│                                     │
│ 🗄️ My Database • 🟡 Deploying      │
│    Last updated: 12/01/2024         │
└─────────────────────────────────────┘
```

### Available Actions

- **Open in Qovery Console**: Opens the service in Qovery console
- **Copy Service ID**: Copies the service ID
- **Copy Service Name**: Copies the service name
- **Refresh Services** (⌘ + R): Refreshes the list
- **Change Credentials** (⌘ + C): Modifies credentials
- **Clear Credentials**: Clears stored credentials

## 🎨 Visual Indicators

### Service Types

- 📱 **Application**: Web/mobile applications
- 🐳 **Container**: Docker containers
- 🗄️ **Database**: Databases
- ⚙️ **Job**: Scheduled tasks
- 🔧 **Other**: Other service types

### Status

- 🟢 **Running**: Service is running
- 🔴 **Stopped**: Service is stopped
- 🟡 **Deploying**: Service is being deployed
- ❌ **Error**: Error on the service
- ⚪ **Unknown**: Unknown status

## 🔒 Security

### Credential Storage

- Uses Raycast's `LocalStorage`
- Automatic encryption by Raycast
- No transmission to third parties
- Can be cleared at any time

### Error Handling

- Clear and informative error messages
- Suggested actions to resolve issues
- Credential validation before use

## 🚀 Typical Usage

1. **Installation**: Import the extension into Raycast
2. **Configuration**: Enter API token and Organization ID
3. **Usage**: View the services list
4. **Actions**: Open in Qovery, copy information
5. **Maintenance**: Refresh, change credentials if needed

## 🔄 Data Flow

```
User → Extension → LocalStorage → Qovery API → Services
     ↓              ↓           ↓           ↓         ↓
  Input → Validation → Storage → Request → Display
```

## 📋 Usage Example

```javascript
// Loading stored credentials
const storedApiToken = await LocalStorage.getItem("qovery_api_token");
const storedOrgId = await LocalStorage.getItem("qovery_organization_id");

// Saving new credentials
await LocalStorage.setItem("qovery_api_token", newToken);
await LocalStorage.setItem("qovery_organization_id", newOrgId);

// Qovery API call
const response = await fetch(
  `https://api.qovery.com/organization/${orgId}/services`,
  {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  }
);
```

This approach provides a smooth and secure user experience for managing Qovery services directly from Raycast!
