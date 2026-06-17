# Origami

## Description

A powerful extension for the [Origami](https://origami.ms) business management platform that allows you to access and control your workspace directly from Raycast.

## Configuration

This extension requires the following configuration:

1. **Organization**: The organization name from your Origami URL (e.g., if your URL is https://acme.origami.ms, enter "acme")
2. **Email**: Your login email address for Origami
3. **API Token**: Generate a new token in your Origami workspace under My Profile > System Preferences > User Management

## Usage

### View Instances

The **View Instances** command enables you to access your Origami instances with robust filtering and search capabilities. It supports three sections of actions:

- **View Actions**:
  - **Filtering**:
    - **All Fields**: Filter instances by the content of fetched data (client-side search) for the selected entity
    - **Field-specific**: Filter instances by the content of specific fields with direct database queries for the selected entity
  - **Show/Hide Archived**: Toggle visibility of archived instances
  - **Pagination**: Adjust the number of instances displayed per page (25, 50, or 100)
  - **Open in Browser**: Open your Origami workspace directly in your browser

> 📌 IMPORTANT 📌
>
> When using the "All Fields" filter option, searches are performed on already fetched data (client-side filtering), so results are limited to the loaded pages.
>
> For comprehensive searching across the entire entity data, use the field-specific filters which query the Origami database directly.

- **Instance Actions**:
  - **Create Instance**: Quickly create a new instance within the currently selected entity
  - **Archive/Unarchive Instance**: Toggle the archive state of an instance
  - **Delete Instance**: Remove instances that are no longer needed

- **Communication Actions**:
  - Send emails to contacts directly from Raycast
  - Make phone calls via iPhone, FaceTime, or FaceTime Audio
  - Send messages to phone numbers

- **Clipboard Actions**:
  - Copy email addresses, phone numbers, and instance IDs to Clipboard

### Create Instance

The **Create Instance** command allows you to create new instances by selecting an entity and filling in the relevant information.

### AI Extension

This extension integrates with Raycast's AI features, providing tools to retrieve and interact with your Origami data. You can use natural language commands to work with your Origami data directly from Raycast's AI interface, without needing to navigate the Origami web interface.

Available AI tools include:

- **Data Retrieval**:
  - **Get Entities**: List all available entities in your Origami workspace
  - **Get Entity Structure**: View the structure of a specific entity including field types
  - **Get Instances**: Fetch instances of a specific entity with field-specific filtering criteria

- **Data Management**:
  - **Create Instance**: Create a new instance with custom field values
  - **Edit Instance**: Update field values of an existing instance
  - **Archive Instance**: Archive or unarchive instances to manage visibility
  - **Delete Instance**: Remove instances from your Origami workspace

Example prompts you can use with the AI:
- "Have there been any payments from converted leads in the last 7 days?"
- "What was the total revenue for March?"
- "Show me all high priority campaigns led by Don Draper"
- "Add a task for following up with the Wonka Industries account, due tomorrow"
- "create a sales opportunity for $250,000 with Wayne Enterprises and mark it as in the proposal stage"
- "Archive the Website Redesign project"

## Author

Developed by Arthur Pinheiro ([@xilopaint on GitHub](https://github.com/xilopaint)).

## License

This extension is released under the MIT License.
