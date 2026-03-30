# Marble

Manage your [Marble](https://marblecms.com) content directly from Raycast. View, create, edit, and delete posts, authors, categories, and tags without leaving your keyboard.

## Setup

1. Get your API key from the [Marble workspace dashboard](https://marblecms.com)
2. Open any Marble command in Raycast
3. Enter your API key when prompted (stored securely in Raycast preferences)

**Note:** Write operations (create, update, delete) require a private API key. Public keys are read-only.

## Commands

| Command | Description |
|---------|-------------|
| View Posts | List and manage posts with published/draft filtering and detail view |
| Create Post | Create a new post with category, tags, and author selection |
| View Authors | List and manage authors with bio preview |
| Create Author | Create a new author with bio, role, and image |
| View Categories | List and manage categories |
| Create Category | Create a new category |
| View Tags | List and manage tags |
| Create Tag | Create a new tag |

## Features

- Paginated list views with search
- Published/Draft status badges and filtering on posts
- Full post detail view with markdown content and metadata sidebar
- Inline editing and deletion for all resources
- Optimistic UI updates on delete
- Auto-generated slugs from titles
- Zod schema validation on all form submissions
- Cached data for instant loading on subsequent opens
- Create new resources from within list views via Cmd+N
