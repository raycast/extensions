# BambooHR - Time Tracking

Manage your time tracking on BambooHR directly from Raycast. Clock in/out, view your timesheet, edit entries, and track your hours with intelligent splitting and validation features.

**Disclaimer:** This extension is not officially associated with or endorsed by BambooHR. It is an independent third-party application that uses BambooHR's public API.

## Setup

### Required Settings
1. **API Key**: Your BambooHR API key (generate from your BambooHR account settings)
2. **Company Domain**: Your BambooHR subdomain (e.g., "mycompany" for mycompany.bamboohr.com)
3. **Employee ID**: Your employee ID number in BambooHR

### Optional Settings
- **Warn After Continuous Hours**: Show warnings for long work periods without breaks
- **Warn Daily Hours**: Alert when exceeding daily hour targets
- **Default Pause Duration**: Break time when splitting entries in minutes
- **Include Weekends**: Show weekend days in timesheet view (default: false)

### Split Mode Settings
Choose how entries are automatically split:

- **After Maximum Hours**: Split after a set number of hours (configurable)
  - **Max Work Hours**: Hours before splitting
- **Custom Times**: Split at specific times of day
  - **Custom Split End Time**: When first entry should end
  - **Custom Split Start Time**: When second entry should start

## Commands

### Clock In
- Start tracking time for the current day

### Clock Out  
- Stop tracking time for the current day

### Get Status
- Check current clock status and today's duration
- **Features**:
  - Shows if you're currently clocked in or out
  - Displays running time if clocked in
  - Shows total time for completed days

### Get Timesheet
- View and manage time entries for the current month
- **Features**:
  - Monthly calendar view with daily totals
  - Navigate between months (Previous/Next/Current)
  - Shows holidays and time off
  - Comprehensive entry management

#### Timesheet Entry Actions

**Features**
- **Edit Entry**: Modify a single time entry (start, end, note, project)
- **Split Entry**: Break long entries into two parts with automatic pause insertion
- **Edit Day**: Manage all entries for a day with full context
- **Add Entry**: Create new time entries with smart defaults
- **Delete Entry**: Remove time entries with confirmation
