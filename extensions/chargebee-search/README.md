# Chargebee Search

Search customers, invoices, and credit notes across your Chargebee sites directly from Raycast.

## Features

- **Unified search**: Automatically detects what you're searching for
  - Type a company name → searches customers
  - Type a number (e.g., `1407419`) → searches invoices
  - Type a credit note ID (e.g., `CN-143`) → searches credit notes
- **Multi-site support**: Search across one or two Chargebee sites simultaneously
- **Quick actions**: Open customers, subscriptions, invoices, and PDFs directly in Chargebee
- **Recent history**: Quickly access recently viewed items

## Setup

### 1. Get Your Chargebee API Key

1. Log in to your Chargebee admin console
2. Go to **Settings** → **Configure Chargebee** → **API Keys**
3. Create a new API key with **Read-Only** permissions
4. Copy the API key

> **Important**: This extension only reads data. Use a **Read-Only API key** for security.

### 2. Configure the Extension

Open Raycast preferences for this extension and enter:

- **Primary Site ID**: Your Chargebee site ID (the subdomain in `yoursite.chargebee.com`)
- **Primary Site Name**: A display name (e.g., "Production")
- **Primary API Key**: Your read-only API key

#### Optional: Second Site

If you have multiple Chargebee sites (e.g., production and test), you can add a secondary site:

- **Secondary Site ID**: Your second site's ID
- **Secondary Site Name**: A display name (e.g., "Test")
- **Secondary API Key**: API key for the second site

## Usage

1. Open Raycast and type "Search Chargebee"
2. Start typing:
   - Company name to find customers
   - Invoice number to find invoices
   - Credit note ID (e.g., `CN-123`) to find credit notes
3. Press Enter to open in Chargebee, or press ⌘K for more actions

### Available Actions

**For Customers:**
- Open Customer
- Open Subscription
- Open Last Invoice
- Copy Customer ID / Email

**For Invoices:**
- Open Invoice
- Open Customer
- View PDF
- Copy Invoice Number / Customer ID

**For Credit Notes:**
- Open Credit Note
- Copy Credit Note ID / Customer ID

## Tips

- Customers are sorted by renewal date (furthest in the future first)
- Recently clicked items appear when you open the extension with an empty search
- The site badge color helps distinguish results from different sites
