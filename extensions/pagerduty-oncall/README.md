# PagerDuty On-Call Raycast Extension

View your recent past, current and upcoming on-call schedules from PagerDuty directly in Raycast.

## 🚀 Features

- **Recent & Upcoming View**: See your last 2 completed shifts plus all upcoming on-call duties
- **Multiple Time Filters**: View by upcoming, active, past, monthly, or custom time ranges
- **Visual Status Indicators**: Clear icons and colors for past (✓), active (🔴), and upcoming (🔵) shifts
- **Detailed Schedule Info**: Duration, dates, and schedule names with clickable links to PagerDuty
- **Quick Actions**: Open schedules in PagerDuty, copy details, or access dashboard

## 📋 Prerequisites

Before using this extension, you'll need:

1. **PagerDuty Account**: Access to a PagerDuty organization with on-call schedules
2. **API Token**: A PagerDuty API token with read access to your schedules
3. **User Email**: Your PagerDuty account email address

## 🔧 Setup Instructions

### Step 1: Get Your PagerDuty API Token

1. Log in to your PagerDuty account
2. Go to **Integrations** → **API Access Keys**
3. Click **Create New API Key**
4. Enter a description (e.g., "Raycast Extension")
5. **Important**: Check "Read-only API Key" for security
6. Click **Create Key** and copy the token immediately
7. Store it securely - this is the only time it will be displayed

### Step 2: Configure the Extension

1. Install the extension in Raycast
2. Run the command and you'll be prompted to configure:
   - **PagerDuty API Token**: Paste your API token from Step 1
   - **User Email**: Enter your PagerDuty account email address

### Step 3: Start Using

Once configured, the extension will show:

- Your **last 2 completed** on-call shifts
- Any **currently active** on-call duties
- All **upcoming** on-call schedules

## 🎛️ Available Filters

- **Recent & Upcoming** (default): Last 2 past + all upcoming shifts
- **Past Shifts**: All completed on-call duties
- **All (4 months)**: Next 4 months from today

## 🔒 Privacy & Security

- Your API token is stored locally in Raycast's secure preferences
- No data is transmitted to third parties - only direct PagerDuty API calls
- Read-only API access ensures your PagerDuty data cannot be modified

## 📞 Troubleshooting
