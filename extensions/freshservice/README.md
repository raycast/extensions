# Freshservice Raycast Extension

A Raycast extension to manage Freshservice tickets directly from your command bar.

## Features

- **Search Tickets**: Quickly find tickets using keywords (subjects or descriptions) with instant local filtering.
- **Open Tickets**: View your currently assigned and open tickets.
- **Ticket Details**: View subjects, descriptions, and conversations for a specific ticket.
- **Manage Tasks**: View and update tasks associated with a ticket.
- **Add Notes/Replies**: Respond to tickets directly from Raycast.

## Setup

1.  Open Raycast and search for the extension.
2.  Provide your Freshservice **Domain** (e.g., `yourcompany.freshservice.com`) and **API Key** when prompted.
3.  You can find your API Key in your Freshservice profile settings.

## Development

-   Run `npm install` to install dependencies.
-   Run `npm run dev` to start the extension in development mode.
-   Run `npm run build` to create a production-ready build for local usage.

## Recent Changes

-   **Improved Search Reliability**: The search functionality now uses Raycast's local filtering on retrieved tickets, providing a faster and more stable experience compared to the previous API-side search.
-   **Consistent UI**: Standardized response mapping across `search-tickets` and `open-tickets` for better maintainability.
