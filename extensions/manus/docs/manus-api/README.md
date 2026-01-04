# Manus API Documentation

The Manus Integrations API allows developers to seamlessly integrate Manus as a complete AI agent into their workflows. This documentation provides comprehensive guides and API reference for all available endpoints.

## Getting Started

| Document                        | Description                                           |
| ------------------------------- | ----------------------------------------------------- |
| [Overview](./1-Overview.md)     | Introduction to the Manus API and available endpoints |
| [Quickstart](./2-Quickstart.md) | Generate an API key and make your first call          |
| [Security](./4-Security.md)     | Best practices for securing your webhook endpoints    |
| [Webhooks](./3-Webhooks.md)     | Real-time notifications for task lifecycle events     |

## API Reference

### Projects

Projects allow you to organize tasks and apply consistent instructions across multiple tasks.

| Endpoint       | Method | Document                               | Description                                                               |
| -------------- | ------ | -------------------------------------- | ------------------------------------------------------------------------- |
| `/v1/projects` | POST   | [Create Project](./5-CreateProject.md) | Creates a new project to organize tasks and apply consistent instructions |
| `/v1/projects` | GET    | [List Projects](./6-ListProjects.md)   | Retrieves a list of all projects in your account                          |

### Tasks

Tasks represent AI agent operations that you create and manage through the API.

| Endpoint              | Method | Document                          | Description                                                      |
| --------------------- | ------ | --------------------------------- | ---------------------------------------------------------------- |
| `/v1/tasks`           | POST   | [Create Task](./7-CreateTask.md)  | Creates a new task                                               |
| `/v1/tasks`           | GET    | [Get Tasks](./8-GetTasks.md)      | Retrieves a list of tasks with optional filtering and pagination |
| `/v1/tasks/{task_id}` | GET    | [Get Task](./9-GetTask.md)        | Retrieves details of a specific task by ID                       |
| `/v1/tasks/{task_id}` | PUT    | [Update Task](./10-UpdateTask.md) | Updates a task's metadata                                        |
| `/v1/tasks/{task_id}` | DELETE | [Delete Task](./11-DeleteTask.md) | Deletes a task by ID                                             |

### Files

File management endpoints for uploading and managing file attachments used in tasks.

| Endpoint              | Method | Document                          | Description                                                                            |
| --------------------- | ------ | --------------------------------- | -------------------------------------------------------------------------------------- |
| `/v1/files`           | POST   | [Create File](./12-CreateFile.md) | Creates a file record and returns a presigned URL for uploading the file content to S3 |
| `/v1/files`           | GET    | [List Files](./13-ListFiles.md)   | Retrieves a list of the 10 most recently uploaded files                                |
| `/v1/files/{file_id}` | GET    | [Get File](./14-GetFile.md)       | Retrieves details of a specific file by ID                                             |
| `/v1/files/{file_id}` | DELETE | [Delete File](./15-DeleteFile.md) | Deletes a file by ID. This removes both the file record and the file from S3 storage   |

### Webhooks

Webhook endpoints for registering and managing real-time notifications.

| Endpoint                    | Method | Document                                | Description           |
| --------------------------- | ------ | --------------------------------------- | --------------------- |
| `/v1/webhooks`              | POST   | [Create Webhook](./16-CreateWebhook.md) | Creates a new webhook |
| `/v1/webhooks/{webhook_id}` | DELETE | [Delete Webhook](./17-DeleteWebhook.md) | Deletes a webhook     |

## Additional Resources

For more information and navigation across all documentation pages, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
