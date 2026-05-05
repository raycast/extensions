# Finicky Rule Manager

Manage [Finicky](https://github.com/johnste/finicky) browser routing rules directly from Raycast.

## Features

- **AI-Powered Rule Management**: Use natural language in Raycast AI Chat to create, update, and manage rules
- **Visual Rule Management**: Create, edit, enable/disable, and delete Finicky rules through an intuitive UI
- **Create from Browser Tabs**: Instantly create rules from your currently open browser tabs
- **Change Default Browser**: Quick visual browser selector with app icons
- **Guided Rule Builder**: Step-by-step form to build URL patterns without knowing the syntax
- **Browser Auto-Detection**: Automatically detects installed browsers for easy selection
- **Conflict Detection**: Automatically find and resolve conflicting rules
- **Modern ES Module Syntax**: Generates config files using `export default` instead of `module.exports`
- **Automatic Config Generation**: Rules are stored in Raycast Local Storage and automatically generate your `.finicky.js` config file
- **Two Match Types**:
  - **Wildcards**: Use Finicky's native wildcard patterns (e.g., `*://*.salesforce.com/*`)
  - **Regex**: Test patterns against the full URL string (case-insensitive by default)
- **Quick Actions**: Toggle rules on/off, open config file, reload rules
- **Safe Deletion**: Confirmation dialog before deleting rules

## Setup

1. Install the extension
2. Open extension preferences (⌘,) and configure:
   - **Finicky Config Path**: Path to your Finicky config file (e.g., `~/.finicky.js`)
   - **Default Browser**: Your default browser (e.g., `Brave Browser`, `Arc`, `Safari`)

## Usage

### Using AI Chat (Easiest Method)

The extension integrates with Raycast AI Chat, allowing you to manage rules using natural language:

1. Open Raycast AI Chat (⌘ Space, then type "AI Chat")
2. Mention the extension with `@Finicky Rule Manager`
3. Ask questions or give commands in plain English:

**Example commands:**

- "Send all google.com subpages to Chrome"
- "Create a rule for Salesforce that opens in Arc"
- "Show me all my rules"
- "Find conflicts in my rules"
- "Delete the Salesforce rule"
- "Disable the Google rule"
- "What rules do I have for GitHub?"

The AI will:

- ✓ Automatically detect conflicts before creating rules
- ✓ Ask clarifying questions if your request is ambiguous
- ✓ Confirm destructive actions before executing
- ✓ Provide helpful suggestions for pattern matching

**Note**: Requires Raycast Pro for AI features.

### Creating a Rule from a Browser Tab

The fastest way to create a rule is from an open browser tab:

1. Run the "Create Rule from Browser Tab" command
2. Browse or search through your currently open tabs (grouped by domain)
3. Select a tab to create a rule for it
4. The rule is automatically created with:
   - **Name**: Tab title or domain
   - **Pattern**: Auto-generated to match the domain and all subdomains (e.g., `*://*.google.com/*`)
   - **Browser**: Your configured default browser

**Note**: Requires the [Raycast Browser Extension](https://www.raycast.com/browser-extension) to be installed.

### Changing the Default Browser

Quickly change your Finicky default browser with a visual browser selector:

1. Run the "Change Default Browser" command
2. Browse the list of detected browsers (with app icons)
3. Click on any browser to set it as your new default
4. Your `.finicky.js` config file is automatically updated

**Features:**

- Shows all installed browsers with their actual app icons
- Current default browser is marked with a ✓ checkmark
- Live updates - the checkmark moves immediately after selection
- Searchable list for quick filtering
- Real-time toast notifications showing progress and success

### Creating a Rule Manually

#### Guided Mode (Recommended for Beginners)

1. Run the "Manage Finicky Rules" command
2. Press ⌘N or select "Create New Rule"
3. Use the guided form to build your pattern:
   - **Protocol**: Choose http, https, or any
   - **Subdomain**: Choose any, none, www, or enter a custom subdomain
   - **Domain**: Enter the domain (e.g., `google.com`)
   - **Path**: Choose any path, no path, or enter a custom path
   - **Browser**: Select from detected browsers or enter manually
4. See a live preview of your pattern as you build it

#### Manual Mode (For Advanced Users)

1. Press ⌘T to switch to manual mode
2. Enter patterns directly (one per line):
   - **Name**: Display name for the rule
   - **Enabled**: Whether the rule is active
   - **Match Type**: Choose between wildcards or regex
   - **Patterns**: One pattern per line
   - **Browser**: Select from detected browsers or enter manually (⌘B to toggle)

### Example Rules

#### Salesforce (Regex)

- Name: `Salesforce`
- Match Type: `regex`
- Patterns: `salesforce`
- Browser: `Arc`

#### Google & Gmail (Wildcards)

- Name: `Google Services`
- Match Type: `wildcards`
- Patterns:

  ```text
  *://*.google.com/*
  *://google.com/*
  *://mail.google.com/*
  ```

- Browser: `Arc`

## Importing Existing Rules

### Auto-Import on First Launch

When you first run the extension, if you have an existing `.finicky.js` file but no rules in Raycast storage, you'll be prompted to import your existing rules. This ensures you don't lose any work you've already done.

### Manual Import

You can manually import rules at any time:

1. Press ⌘I or select "Import from Config File"
2. The extension will parse your `.finicky.js` and extract rules
3. If you already have rules, you'll be asked to **Merge** (keep both) or **Replace** (delete existing)

**Supported patterns:**

- Wildcard arrays: `match: ["*://*.example.com/*"]`
- Regex functions: `match: ({ urlString }) => /pattern/i.test(urlString)`
- RegExp constructors: `match: ({ urlString }) => new RegExp("pattern", "i").test(urlString)`

## How It Works

This extension treats your Finicky config as **generated**. Rules are stored in Raycast Local Storage as structured JSON, and the `.finicky.js` file is rewritten whenever rules change.

⚠️ **Important**: After importing, do not manually edit your `.finicky.js` file, as changes will be overwritten. Use the extension to manage all rules.

## Commands

This extension provides the following commands:

1. **Manage Finicky Rules** - Main command for viewing and managing all rules
2. **Create Rule from Browser Tab** - Create rules from currently open browser tabs
3. **Change Default Browser** - Visual browser selector to change your default browser
4. **AI Tools** (via Raycast AI Chat):
   - `list-rules` - List all rules with details
   - `create-rule` - Create a new rule with conflict detection
   - `update-rule` - Update an existing rule
   - `delete-rule` - Delete a rule by ID or name
   - `find-conflicts` - Find and list conflicting rules
