# Google AI Search for Raycast

A powerful Raycast extension that brings Google's AI Overview experience directly to your desktop, powered by Google Gemini AI.

## Features

### 🤖 AI-Powered Overviews
- **Streaming responses** - See AI answers appear in real-time, just like Google.com
- **Google AI Overview style** - Concise, factual summaries with proper formatting
- **Multiple Gemini models** - Choose from Gemini 2.0 Flash, 1.5 Pro, or 1.5 Flash

### 🔍 Real Source Integration
- **Google Custom Search API** - Fetch actual search results as sources
- **Smart fallback sources** - Intelligent mock sources when API isn't configured
- **Source-based summaries** - Gemini creates overviews using real source content
- **Clickable sources** - Jump to original websites with keyboard shortcuts

### 📚 Search History Management
- **Persistent history** - Your searches are saved across Raycast sessions
- **Quick selection** - Dropdown to easily reuse previous searches
- **Individual deletion** - Remove specific items from history (`Cmd+H` → `Cmd+Delete`)
- **Clear all option** - Bulk delete entire history (`Cmd+Shift+Delete`)
- **Searchable history** - Filter through your past searches

### ⌨️ Keyboard-First Experience
- **Enter to search** - Simple form submission
- **Cmd+Enter** - Quick access to Google search
- **Cmd+H** - Manage search history
- **Cmd+1,2,3** - Open source links directly
- **Cmd+C** - Copy AI overview
- **Cmd+Shift+C** - Copy with sources

### 🎯 Google-like Actions
- **Open in Google** - Jump to Google search for the same query
- **Copy responses** - Save AI overviews to clipboard
- **Source navigation** - Quick access to all referenced websites
- **New queries** - Seamless flow for follow-up searches

## Installation

1. Install the extension in Raycast
2. Configure your **Gemini API Key** (required)
3. Optionally add **Google Custom Search API** credentials for real sources

## API Setup

### Required: Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Click **"Get API Key"**
3. Create a new API key or use an existing one
4. Copy the key and paste it in Raycast extension preferences

### Optional: Google Custom Search (for real sources)

#### Step 1: Get Custom Search API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Custom Search API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the API key

#### Step 2: Create Custom Search Engine
1. Go to [Google Custom Search](https://cse.google.com/cse/)
2. Click **"Add"** to create a new search engine
3. Enter `google.com` as the site to search
4. Create the search engine
5. Go to **Setup** → **Basics** → **Search the entire web** (turn ON)
6. Copy the **Search Engine ID**

#### Step 3: Configure Extension
1. Open Raycast extension preferences
2. Add your **Google Custom Search API Key**
3. Add your **Search Engine ID**

**Note:** Without Google Custom Search API, the extension will use smart fallback sources and still work perfectly for AI overviews.

## Usage

1. Open Raycast (`Cmd+Space`)
2. Type "Ask Google AI" or use the extension
3. Enter your question or search query
4. Press **Enter** to get AI overview
5. Use **Cmd+K** to see all available actions

---

*Powered by Google Gemini AI • Built for Raycast*