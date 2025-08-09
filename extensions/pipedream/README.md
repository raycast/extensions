# Pipedream Workflow Manager for Raycast

Manage your Pipedream workflows directly from Raycast with AI-powered error analysis. Connect, monitor, and optimize your workflows with intelligent insights.

## Features

- **Workflow Management**: Connect, view, and manage your Pipedream workflows
- **AI-Powered Error Analysis**: Intelligent error categorization and insights using Raycast AI
- **Error Tracking**: Monitor workflow errors with real-time error counts and detailed error information
- **Menu Bar Integration**: Quick access to workflows and error counts from your menu bar
- **Smart Filtering & Sorting**: Filter workflows by status, errors, or menu bar visibility
- **Background Refresh**: Automatic error count updates every 5 minutes
- **Optimistic UI**: Instant feedback for workflow activation/deactivation
- **Global Shortcuts**: Quick refresh with ⌘R
- **Customizable Preferences**: Set default sort order, filter, and refresh intervals
- **Copy Workflow URL**: Quick copy functionality throughout the app
- **Raw Logs View**: Direct access to view raw error logs for detailed investigation
- **Enhanced Error Management**: Comprehensive error categorization, severity assessment, and resolution tracking

## Quick Start

### Prerequisites

- A Pipedream account ([Sign up here](https://pipedream.com/))
- Your Pipedream API key ([Get it here](https://pipedream.com/settings/user))

### Installation

1. Install the extension from the Raycast store
2. Open the extension in Raycast
3. Enter your Pipedream API key when prompted
4. Start managing your workflows!

## Commands

### Connect Workflow

Connect an existing Pipedream workflow to manage. Enter the workflow URL and customize the display name.

### Manage Workflows

View and manage your saved Pipedream workflows with advanced features:

- **Sorting**: Sort by name, error count, trigger count, or step count
- **Filtering**: Show all workflows, menu bar workflows, or workflows with errors
- **Quick Actions**: Activate/deactivate workflows with instant feedback
- **Workflow Details**: View detailed analytics and performance data
- **Global Refresh**: Use ⌘R to refresh all workflow data
- **Copy Workflow URL**: Quick copy functionality for sharing workflows

### Show in Menu Bar

Display workflow status and error counts in your menu bar:

- **Status Indicators**: Green dots for active workflows, grey for inactive
- **Error Counts**: Shows error count with "100+" for counts over 100
- **Quick Actions**: Activate/deactivate workflows directly from menu bar
- **Background Updates**: Automatically refreshes every 5 minutes

### Workflow Analytics

View detailed analytics and performance data for your workflows:

- **Performance Metrics**: Execution times, success rates, and error trends
- **AI-Powered Insights**: Intelligent error analysis and recommendations
- **Event History**: Detailed view of workflow execution events
- **Error Categorization**: Smart categorization of errors by type and severity
- **Raw Logs View**: Direct access to view raw error logs for detailed investigation
- **Copy & Regenerate Actions**: Easy copy-to-clipboard and regenerate functionality for AI summaries
- **Smart Link Generation**: Automatically adds relevant Pipedream documentation links based on error types

## Configuration

Configure the extension behavior in Raycast preferences:

- **Default Sort**: Choose how workflows are sorted by default (name, errors, triggers, steps)
- **Default Filter**: Set the initial filter view (all, menu bar, errors)
- **Refresh Interval**: Customize how often error counts are updated (5, 10, 15, 30, or 60 minutes)

## AI-Powered Error Analysis

The extension includes intelligent error analysis powered by Raycast AI:

- **Smart Categorization**: Errors are automatically categorized by type (API, authentication, network, etc.)
- **Severity Assessment**: Errors are assessed for severity to help prioritize fixes
- **Intelligent Insights**: Get AI-powered recommendations for error resolution
- **Contextual Analysis**: Error analysis considers workflow context and history
- **Data-Driven Insights**: AI analysis is purely based on provided error logs without external assumptions
- **Enhanced Prompting**: Optimized AI prompts for concise, well-structured summaries with clear markdown formatting

## Error Tracking

The extension provides comprehensive error tracking:

- **Real-time Error Counts**: Updated every 5 minutes in the background
- **Error Details**: View the last error message and timestamp for each workflow
- **Visual Indicators**: Clear error count badges and status dots
- **Quick Access**: Jump directly to error logs from the menu bar or management interface
- **Enhanced Error Management**: Comprehensive error categorization, severity assessment, and resolution tracking

## Tips & Tricks

- Use the menu bar item for quick access to your workflows and error counts
- Set your preferred default sort and filter in preferences for a personalized experience
- Use ⌘R to quickly refresh all workflow data when needed
- Error counts are automatically updated in the background every 5 minutes
- Workflow activation/deactivation provides instant visual feedback
- Sort workflows by name, error count, trigger count, or step count in the "Manage Workflows" view
- Filter workflows to show only those in the menu bar, those with errors, or all workflows
- Use AI-powered error analysis to get intelligent insights into workflow issues
- Copy workflow URLs for easy sharing and collaboration

## Technical Details

- **API Integration**: Secure Pipedream API integration with error handling
- **AI Integration**: Raycast AI-powered error analysis and insights
- **Optimistic Updates**: Instant UI feedback for better user experience
- **Background Refresh**: Automatic data updates without user intervention
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Graceful handling of API errors and network issues
- **Performance**: Efficient data fetching and caching for smooth operation
- **Enhanced Error Management**: Comprehensive error categorization, severity assessment, and resolution tracking

## Development

### Prerequisites

- Node.js 18 or later
- Raycast CLI

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd pipedream

# Install dependencies
npm install

# Start development
npm run dev
```

### Available Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Feedback

If you have any issues or suggestions, please [open an issue](https://github.com/raycast/extensions/issues) in the Raycast extensions repository.

## License

This project is licensed under the MIT License.
