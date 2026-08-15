# v0 Raycast Extension

This Raycast extension provides seamless integration with v0 via the v0 Platform API, allowing you to create, view, and manage your v0 chats and projects directly from your Raycast launcher.

## Capabilities

### Projects

Manage your v0 projects, essential for organizing your AI-powered development sessions.

- [**Create Project**](https://v0.dev/docs/api/platform#create-project): Creates a new v0 project with an optional description, icon, environment variables, and instructions. Projects help organize chats and manage context.
- [**View Projects**](https://v0.dev/docs/api/platform#find-projects): Returns a list of all v0 projects in your workspace. Useful for browsing or managing projects across different chats or use cases.
- [**Assign Project to Chat**](https://v0.dev/docs/api/platform#assign-project-to-chat): Links an existing v0 project to a specific chat. Helps group conversations under a shared project context.

### Chats

Interact with your v0 AI chats, from initiating new conversations to managing existing ones.

- [**Create Chat**](https://v0.dev/docs/api/platform#create-chat): Creates a new chat using a user message, optional system context, and model configuration. Useful for prompting the model within the scope of a specific project.
- [**View Chats**](https://v0.dev/docs/api/platform#find-chats): Retrieves a list of existing chats, with support for pagination and filtering by favorite status. Helps manage and navigate chat history.
- [**Initialize Chat**](https://v0.dev/docs/api/platform#initialize-chat): Initializes a new chat from source content such as files, repositories, registries, or zip archives. Enables context-rich conversations based on code or assets.
- [**Delete Chat**](https://v0.dev/docs/api/platform#delete-chat): Deletes a specific chat based on the provided `chatId`. This operation is irreversible and permanently removes the chat and its contents.
- [**Favorite Chat**](https://v0.dev/docs/api/platform#favorite-chat): Marks or unmarks a chat as a favorite using its `chatId`. This helps with organizing and quickly accessing important chats.
- [**Fork Chat**](https://v0.dev/docs/api/platform#fork-chat): Creates a new chat fork from a specific version within an existing chat. Useful for branching off alternate directions without modifying the original conversation.
- [**Add Message**](https://v0.dev/docs/api/platform#send-message): Creates a new message in an existing chat. Triggers a model response using the provided prompt, with optional attachments and configuration settings.
- [**Update Chat Privacy**](https://v0.dev/docs/api/platform#update-chat): Updates the metadata of an existing chat using its `chatId`.

### Billing

Keep track of your v0 usage and billing information.

- [**View Billing**](https://v0.dev/docs/api/platform#get-billing): Fetches billing usage and quota information for the authenticated user.

### Profiles

Manage multiple v0 API key profiles for different teams or personal use.

- **Manage Profiles**: Add, switch, rename, and delete different v0 API key profiles, allowing you to seamlessly manage access to various v0 accounts or scopes.
- **Set Default Scope**: Configure a default scope for each profile to streamline operations within specific organizational contexts.

## Setup

1.  **Get your v0 API Key**:
    - Log in to your v0 account at [https://v0.dev/](https://v0.dev/).
    - Navigate to your account settings to find your API key: [https://v0.dev/settings/keys](https://v0.dev/settings/keys).

2.  **Configure the API Key in Raycast**:
    - After installation, the extension will prompt you to enter your API Key.
    - Alternatively, you can go to Raycast Preferences -> Extensions -> "v0" -> "Preferences" and enter your API Key there. You can also manage multiple profiles with different API keys via the "Manage Profiles" command.
