# Onbo: New Grad & Internship Job Tracker for Raycast

> Streamline your tech job search with integrated opportunity discovery and application tracking in Raycast.

![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![MIT License](https://img.shields.io/badge/License-MIT-green)

## Overview

Onbo transforms the chaotic job search experience into a streamlined, keyboard-driven workflow within Raycast. Built specifically for college students and new grads entering tech, it lets you find roles and track applications without juggling tabs, spreadsheets, and bookmarks.

## Features

### 🔍 Smart Job Discovery
-  **Dual Search Modes:** Separate optimized experiences for New Grad roles and Internships
-  **Real-time Search:** Instant results with keyword matching across titles and companies
-  **Category Filtering:** Software Engineering, Hardware, Data Science, Product, Quant Finance
-  **Intelligent Enhancement:** Disambiguates similar roles with location and compact job IDs

### 📊 Application Management
-  **5-Stage Tracking:** Saved → Applied → Interviewing → Offer → Rejected
-  **Lightning-Fast Updates:** Use ⌘1–5 for instant status changes
-  **Notes on Applications:** Add/edit per-job notes; a pencil icon indicates notes and hovering shows them
-  **Smart Organization:** Chronological sorting with visual status indicators
-  **Role Type Filtering:** Switch between New Grad and Internship views when both exist

### ⚡ Productivity
-  **Custom Browser Support:** Choose a specific browser to open job links (can differ from your macOS default)
-  **Jump to "My Applications":** From search, open the Applications view focused on a saved job
-  **Auto-Save Option:** Optionally save when opening or copying a listing
-  **Keyboard-First Design:** Navigate and act quickly without touching the mouse
-  **Privacy-Focused:** Your data stays local on your device

### 🔄 Data Portability
-  **CSV Export:** Save your applications to a spreadsheet with canonical columns
-  **CSV Import:** Bring applications in with newer-wins conflict handling and advanced options

## Installation

1. Open Raycast (⌘Space)
2. Type "Store" and select "Extension Store"
3. Search for "Onbo: New Grad & Internship Job Tracker"
4. Click "Install"

## Usage

### Finding Jobs
-  ⌘Space → "Find New Grad Roles"
-  ⌘Space → "Find Internships"
-  Type to search; use the Category dropdown to focus results

### Managing Applications
-  **Save or Remove:** ⌘S on any job listing
-  **Track Progress:** ⌘Space → "My Applications"
-  **Update Status:** ⌘1 Saved, ⌘2 Applied, ⌘3 Interviewing, ⌘4 Offer, ⌘5 Rejected
-  **Add/Edit Notes:** ⌘N on a saved listing or within "My Applications"
-  **View in My Applications:** From a saved listing in search, use "View in My Applications" to jump to the item

### Opening Links in Your Preferred Browser
-  Pick a dedicated browser for job links via Preferences → "Open Job Links In"
-  Useful if you use a different browser for applications than your system default
-  Opening a listing will use that browser; falls back to your default if unavailable

## CSV Import & Export

-  **Export**
    - "Export as Spreadsheet" creates a CSV compatible with Excel, Numbers, and Google Sheets
    - Columns: id, company, role, role_type, status, appliedDate, application_url, locations (newline-separated), is_active, statusUpdatedAt, notes
-  **Import**
    - "Import from Spreadsheet" supports:
        - Only update newer entries (recommended)
        - Treat missing dates as newer (advanced)
        - Overwrite existing data (ignore dates)
    - Validates headers and URLs; assigns negative IDs for new local entries

## Configuration

### Preferences
-  Open Job Links In
    - Choose the browser used to open job listings (can be different from your macOS default)
-  Auto-Save on Open/Copy
    - Automatically saves a listing when you open or copy it

**Access:** ⌘Space → "Extensions" → "Onbo: New Grad & Internship Job Tracker" → "Configure Extension"

## Privacy & Security

- **Local Data Only**: Your application tracking data never leaves your device
- **No Account Required**: Works immediately without sign-up or authentication
- **Minimal API Calls**: Only fetches public job listings from Onbo's curated database
- **No Personal Data Collection**: Your notes, statuses, and preferences remain private

## Job Data Source

Job listings are sourced from Onbo's curated database, which aggregates opportunities from:
- Major tech companies (Google, Apple, Microsoft, etc.)
- High-growth startups and scale-ups
- Traditional companies with strong tech teams
- Remote-friendly organizations

Data is updated regularly to ensure freshness and accuracy.

## Keyboard Shortcuts

| Action               | Shortcut | Context                            |
|:---------------------|:---------|:-----------------------------------|
| Save/Remove          | ⌘S       | Job listings                       |
| Add/Edit Note        | ⌘N       | Saved listings and My Applications |
| Mark as Saved        | ⌘1       | My Applications                    |
| Mark as Applied      | ⌘2       | My Applications                    |
| Mark as Interviewing | ⌘3       | My Applications                    |
| Mark as Offer        | ⌘4       | My Applications                    |
| Mark as Rejected     | ⌘5       | My Applications                    |
| Open Application     | ⌘O       | Any job listing                    |
| Copy Link            | ⌘C       | Any job listing                    |

## Contributing

While this extension is complete and functional, suggestions for improvements are welcome. For issues with job listings or requests to add new companies, please reach out through appropriate channels.

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: Use Raycast's built-in feedback system
- **Feature Requests**: Submit through the Extension Store
- **General Questions**: Reach out via GitHub or appropriate channels

---

**Transform your job search from chaos to clarity, one keystroke at a time.**

*Made by developers who understand the job search struggle.*
