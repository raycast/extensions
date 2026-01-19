# Jira Worklogs Raycast Extension

This Raycast extension allows you to easily manage and upload Jira worklogs directly from Raycast. It streamlines your workflow by enabling you to log time without leaving your keyboard.

## Goal

The primary goal of this extension is to simplify the process of tracking time in Jira. It provides a convenient interface to:

- **Add Worklogs:** Quickly add new worklogs for specific Jira issues. You can choose to save them locally or upload them directly to Jira.
- **Manage Local Worklogs:** View, edit, and bulk upload worklogs that have been saved locally. This is useful for batching your time entries.

## Prerequisites

To use this extension, you will need:

1.  **Raycast:** Ensure you have Raycast installed.
2.  **Jira Account:** You need access to a Jira instance.
3.  **Jira Credentials:** The extension requires the following credentials to authenticate with Jira:
    - **Jira Domain:** Your Jira instance URL (e.g., `yourcompany.atlassian.net`).
    - **Email:** The email address associated with your Jira account.
    - **API Token:** A Jira API token. [Learn how to manage API tokens for your Atlassian account](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).

## How to Run Locally

To run this extension locally for development or testing:

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd jira-worklogs
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This command will open the Raycast extension in development mode. You should see "Jira Worklogs" in your root search.

## How to Contribute

Contributions are welcome! If you'd like to improve this extension, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix.
3.  **Make your changes.**
4.  **Lint and Format:**
    Ensure your code adheres to the project's style guidelines.
    ```bash
    npm run lint
    npm run format
    ```
5.  **Commit your changes**.
6.  **Push to the branch**.
7.  **Open a Pull Request.**

### Scripts

- `npm run build`: Build the extension for production.
- `npm run dev`: Start development server.
- `npm run lint`: Run ESLint.
- `npm run fix-lint`: Fix ESLint errors automatically.
- `npm run format`: Format code with Prettier.
