# M3 Tools for Raycast

Manage M3 clients, projects, and time tracking directly from Raycast.

## Features

- **Create Client**: Create new clients with validation to prevent duplicates
- **Create Project**: Create projects for clients with category selection and optional timer start
- **Start Timer**: Start a timer for any active project
- **Stop Timer**: View and stop running timers

## Setup

Configure these preferences in Raycast:

| Preference | Description |
|------------|-------------|
| **API URL** | Pre-filled with `https://tools.makememodern.com` |
| **API Token** | Get this from `config/.env` on the m3 server (look for `RAYCAST_AUTH_TOKEN`) |
| **Username** | Your M3 username (used for time tracking)

## Commands

### Whitelist IP

Whitelist your current IP address on DigitalOcean firewalls:
1. Run the command to see all available firewalls
2. Select a firewall to whitelist immediately, or
3. Select multiple firewalls for batch whitelisting
4. Your current public IP is automatically detected and added

### Create Client

Create a new client with the following fields:
- **Client Name** (required) - Validates that no duplicate exists
- Legal Name
- Status (Potential, Under Development, Hosting, etc.)
- Contact Name, Email, Phone
- Website

### Create Project

1. Search and select a client
2. Fill in project details:
   - **Description** (required)
   - Category (select existing or create new)
   - Hourly Rate / Discounted Rate
   - Estimated Price
   - Request Method
3. Optionally start a timer immediately

### Start Timer

1. Search projects by name or client
2. Select a project to start timing
3. Optionally add a note to the timer

### Stop Timer

1. View all your running timers (or toggle to see all team timers)
2. See elapsed time for each timer
3. Stop individual timers or stop all at once

## API Endpoints

The extension communicates with these M3 API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/raycast/clients/` | GET | List clients |
| `/api/raycast/clients/check/` | GET | Check if client exists |
| `/api/raycast/clients/create/` | POST | Create client |
| `/api/raycast/projects/` | GET | List projects |
| `/api/raycast/projects/categories/` | GET | List project categories |
| `/api/raycast/projects/create/` | POST | Create project |
| `/api/raycast/members/` | GET | List members |
| `/api/raycast/timers/` | GET | List running timers |
| `/api/raycast/timers/start/` | POST | Start timer |
| `/api/raycast/timers/stop/` | POST | Stop timer |
| `/api/raycast/firewalls/` | GET | List DigitalOcean firewalls |
| `/api/raycast/firewalls/whitelist/` | POST | Whitelist IP on firewalls |

All endpoints require Bearer token authentication.
