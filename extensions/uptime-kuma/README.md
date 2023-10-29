# Uptime Kuma

## Features
- See all your monitors and their status (up, down, paused, maintenance)
- See uptime and response time
- See last heartbeats
- Quick access to each monitor's page on Kuma
- Quick access to monitor target page if Http monitor
- Pause/Resume monitors

## Authentication

This extension use the kuma websocket of the frontend, so you need an authentication token to use it.
1. Go to your Kuma frontend dashboard
2. Authenticate 
3. Open your browser devtools
4. Go to the javascript console tab
5. Execute `localStorage.getItem('token')`
6. Copy the token and paste it in the extension options