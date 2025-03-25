**Motion API Documentation - Consolidated**

This document consolidates all information from the Motion API documentation (as of October 25, 2023).  Please note that APIs can change, so always refer to the official documentation for the most up-to-date information.

**Table of Contents**

1.  **Introduction**
    *   Overview of the Motion API
    *   Authentication (API Keys)
    *   Rate Limits
    *   Errors

2.  **Workspaces**
    *   List Workspaces (`GET /api/v1/workspaces`)
    *   Get Workspace (`GET /api/v1/workspaces/{id}`)

3.  **Projects**
      * List Projects (`GET /api/v1/projects`)
      * Get project (`GET /api/v1/projects/{id}`)
    *   Create Project (`POST /api/v1/projects`)
    *   Update Project (`PATCH /api/v1/projects/{id}`)
    *   Delete Project (`DELETE /api/v1/projects/{id}`)

4.  **Tasks**
    *   List Tasks (`GET /api/v1/tasks`)
     *   Get Task (`GET /api/v1/tasks/{id}`)
    *   Create Task (`POST /api/v1/tasks`)
    *   Update Task (`PATCH /api/v1/tasks/{id}`)
    *   Delete Task (`DELETE /api/v1/tasks/{id}`)
    *   Task Statuses
    *   Task Priorities
    *   Task Types

5.  **Schedules**
    * Get Schedule (`GET /api/v1/schedules/{workspaceId}`)

6.  **Users**
     * List Users(`GET/api/v1/users`)
     * Get User (`GET /api/v1/users/{id}`)

7. **Webhooks**
   * Overview
   * Creating Webhooks
   * Webhook Events
     * Task Created
     * Task Updated
     * Task Deleted
     * Project Created
     * Project Updated
     * Project Deleted
    * Verifying Webhooks

---

**1. Introduction**

*   **Overview:** The Motion API allows developers to programmatically interact with Motion data, including workspaces, projects, tasks, and schedules.  This enables integration with other applications and automation of workflows.

*   **Authentication:**
    *   All API requests require authentication using an API key.
    *   API keys are passed in the `X-API-Key` header.
    *   **Example (using curl):**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/workspaces
        ```
    *   API keys can be created and managed within the Motion application (Settings -> API Keys).  Treat API keys like passwords and keep them secure.

*   **Rate Limits:**
    *   The Motion API enforces rate limits to ensure fair usage and prevent abuse.
    *   The specific rate limits are not explicitly documented but are mentioned.  It's likely that exceeding the rate limit will result in `429 Too Many Requests` errors.
    *   If you encounter rate limiting, implement retry logic with exponential backoff in your application.

*   **Errors:**
    *   The API uses standard HTTP status codes to indicate success or failure.
    *   **Common Status Codes:**
        *   `200 OK`:  The request was successful.
        *   `201 Created`: A new resource was successfully created.
        *   `204 No Content`: The request was successful, but there's no content to return (e.g., for DELETE requests).
        *   `400 Bad Request`: The request was malformed or invalid.  The response body will usually contain details about the error.
        *   `401 Unauthorized`: Authentication failed (missing or invalid API key).
        *   `403 Forbidden`:  The API key does not have permission to access the requested resource.
        *   `404 Not Found`: The requested resource was not found.
        *   `422 Unprocessable Entity`:  The request was well-formed, but the server couldn't process it due to semantic errors (e.g., validation failures).
        *   `429 Too Many Requests`:  Rate limit exceeded.
        *   `500 Internal Server Error`:  An unexpected error occurred on the server.

    *   Error responses typically include a JSON body with more information:
        ```json
        {
          "message": "Description of the error",
          "type": "error_type" // Optional, e.g., "validation_error"
        }
        ```

---

**2. Workspaces**

*   **List Workspaces (`GET /api/v1/workspaces`)**
    *   Retrieves a list of all workspaces the API key has access to.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/workspaces
        ```
    *   **Response (Success - 200 OK):**
        ```json
        [
          {
            "id": "workspace_id_1",
            "name": "Workspace Name 1",
            "createdTime": "2023-10-26T10:00:00Z"
          },
          {
            "id": "workspace_id_2",
            "name": "Workspace Name 2",
            "createdTime": "2023-10-26T11:00:00Z"
          }
        ]
        ```

*   **Get Workspace (`GET /api/v1/workspaces/{id}`)**
    *   Retrieves a single workspace by its ID.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/workspaces/workspace_id_1
        ```
    *   **Response (Success - 200 OK):**
        ```json
        {
          "id": "workspace_id_1",
          "name": "Workspace Name 1",
          "createdTime": "2023-10-26T10:00:00Z"
        }
        ```
    *   **Response (Error - 404 Not Found):**
        ```json
        {
          "message": "Workspace not found",
          "type": "not_found"
        }
        ```

---

**3. Projects**

*   **List Projects (`GET /api/v1/projects`)**
    *   Retrieves all projects within all accessible workspaces, can be filtered by workspaceId
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/projects
        ```
        With workspace id query param:
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" 'https://api.usemotion.com/api/v1/projects?workspaceId=yourWorkspaceId'
        ```
    *   **Response (Success - 200 OK):**
    ```json
      [
          {
              "id": "string",
              "createdTime": "2024-01-31T19:11:45.446Z",
              "name": "string",
              "workspaceId": "string",
              "description": "string",
              "deadline": "2024-01-31T19:11:45.446Z",
              "status": {
                  "name": "string",
                  "type": "TO_DO"
              }
          }
      ]
      ```

* **Get Project (`GET /api/v1/projects/{id}`)**
   *   Retrieves a single project by its ID.
   * **Request:**

      ```bash
      curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/projects/project_id_1
      ```
  *  **Response (Success - 200 OK):**

    ```json
    {
        "id": "string",
        "createdTime": "2024-01-31T19:11:45.446Z",
        "name": "string",
        "workspaceId": "string",
        "description": "string",
        "deadline": "2024-01-31T19:11:45.446Z",
        "status": {
            "name": "string",
            "type": "TO_DO"
        }
    }
    ```

*   **Create Project (`POST /api/v1/projects`)**
    *   Creates a new project within a specified workspace.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -X POST -d '{
          "workspaceId": "yourWorkspaceId",
          "name": "My New Project",
          "status": {
            "name": "my new status",
            "type": "TO_DO"
          },
          "deadline": "2024-11-26T12:00:00Z",
          "description": "Optional project description"
        }' https://api.usemotion.com/api/v1/projects
        ```
    *   **Request Body (JSON):**
        *   `workspaceId` (string, required): The ID of the workspace to create the project in.
        *   `name` (string, required): The name of the project.
        * `status (object, required): Contains a name (string, required) and a type(string, required)`.  Valid type values: "TO_DO","IN_PROGRESS","DONE","CANCELED".
        *   `deadline` (string, optional):  ISO 8601 timestamp representing the project's deadline.
        * `description` (string, optional)
    *   **Response (Success - 201 Created):**  Returns the created project object (same format as `GET /projects/{id}`).
    *   **Response (Error - 400 Bad Request / 422 Unprocessable Entity):**  Indicates validation errors.

*   **Update Project (`PATCH /api/v1/projects/{id}`)**
    *   Updates an existing project.  You only need to include the fields you want to change.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -X PATCH -d '{
          "name": "Updated Project Name"
        }' https://api.usemotion.com/api/v1/projects/project_id_1
        ```
    *   **Request Body (JSON):**  Same fields as `POST /projects`, but all are optional.
    *   **Response (Success - 200 OK):** Returns the updated project object.

*   **Delete Project (`DELETE /api/v1/projects/{id}`)**
    *   Deletes a project.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" -X DELETE https://api.usemotion.com/api/v1/projects/project_id_1
        ```
    *   **Response (Success - 204 No Content):**  Indicates successful deletion.

---

**4. Tasks**

*   **List Tasks (`GET /api/v1/tasks`)**
    *   Retrieves a list of tasks.  Can be filtered by `workspaceId` and `projectId`
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/tasks
        ```
        With workspace and project filters:
         ```bash
        curl -H "X-API-Key: YOUR_API_KEY" 'https://api.usemotion.com/api/v1/tasks?workspaceId=yourWorkspaceId&projectId=yourProjectId'
        ```
    *   **Response (Success - 200 OK):**
    ```json
    [
        {
            "id": "string",
            "createdTime": "2024-01-31T19:14:10.692Z",
            "name": "string",
            "workspaceId": "string",
            "projectId": "string",
            "description": "string",
            "duration": 0,
            "dueDate": {
                "date": "2024-01-31",
                "isTimeSet": true,
                "timezone": "string"
            },
            "priority": "ASAP",
            "status": {
                "name": "string",
                "type": "TO_DO"
            },
            "assignee": {
                "id": "string",
                "createdTime": "2024-01-31T19:14:10.692Z",
                "email": "string",
                "name": "string",
                "profilePictureUrl": "string"
            },
            "creator": {
                "id": "string",
                "createdTime": "2024-01-31T19:14:10.692Z",
                "email": "string",
                "name": "string",
                "profilePictureUrl": "string"
            },
            "type": "TASK",
            "startTimeConstraint": "2024-01-31",
            "labels": [
                {
                    "id": "string",
                    "createdTime": "2024-01-31T19:14:10.692Z",
                    "name": "string",
                    "workspaceId": "string",
                    "colorHex": "string",
                    "description": "string"
                }
            ],
              "schedules": [
              "string"
              ]
        }
    ]
    ```

*   **Get Task (`GET /api/v1/tasks/{id}`)**
    *   Retrieves a single task by its ID.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/tasks/task_id_1
        ```
    *   **Response (Success - 200 OK):**
        ```json
        {
            "id": "string",
            "createdTime": "2024-01-31T19:14:10.692Z",
            "name": "string",
            "workspaceId": "string",
            "projectId": "string",
            "description": "string",
            "duration": 0,
            "dueDate": {
                "date": "2024-01-31",
                "isTimeSet": true,
                "timezone": "string"
            },
            "priority": "ASAP",
            "status": {
                "name": "string",
                "type": "TO_DO"
            },
            "assignee": {
                "id": "string",
                "createdTime": "2024-01-31T19:14:10.692Z",
                "email": "string",
                "name": "string",
                "profilePictureUrl": "string"
            },
            "creator": {
                "id": "string",
                "createdTime": "2024-01-31T19:14:10.692Z",
                "email": "string",
                "name": "string",
                "profilePictureUrl": "string"
            },
            "type": "TASK",
            "startTimeConstraint": "2024-01-31",
            "labels": [
                {
                    "id": "string",
                    "createdTime": "2024-01-31T19:14:10.692Z",
                    "name": "string",
                    "workspaceId": "string",
                    "colorHex": "string",
                    "description": "string"
                }
            ],
            "schedules": [
               "string"
            ]
        }
        ```

*   **Create Task (`POST /api/v1/tasks`)**
    *   Creates a new task.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -X POST -d '{
          "workspaceId": "yourWorkspaceId",
          "name": "My New Task",
          "description": "Task description",
          "duration": 60,
          "dueDate": {
            "date": "2024-03-01",
            "isTimeSet": false,
            "timezone": null
          },
          "priority": "ASAP",
           "status": {
            "name": "my new status",
            "type": "TO_DO"
          },
          "projectId": null,
        "assigneeId": "user_id_to_assign",
        "startTimeConstraint": null,
        "type": "TASK",
        "labels": []
        }' https://api.usemotion.com/api/v1/tasks
        ```
    *   **Request Body (JSON):**
        *   `workspaceId` (string, required):  The ID of the workspace.
        *   `name` (string, required): The name of the task.
        *   `description` (string, optional): A description of the task.
        *   `duration` (integer, optional):  The estimated duration of the task in *minutes*.
        *   `dueDate` (object, optional):
            *   `date` (string, required):  ISO 8601 date string (e.g., "2024-03-01").
            *   `isTimeSet` (boolean, required): Whether a specific time is set for the due date.
            *   `timezone` (string, optional): Timezone for the due date. If `isTimeSet` is false, this should be null.
        *   `priority` (string, optional):  The priority of the task (see "Task Priorities" below).
        *   `projectId` (string, optional): The ID of the project this task belongs to.
        *   `assigneeId` (string, optional): The ID of the user to assign the task to.
        *   `startTimeConstraint` (string, optional):  ISO 8601 date string representing the earliest date the task can be started.
        *   `type` (string, optional): The type of the task (see "Task Types" below). Defaults to "TASK".
         *   `status` (object, required): See description of status in Project section.
        *   `labels` (array, optional): An array of label IDs to associate with the task.

    *   **Response (Success - 201 Created):**  Returns the created task object.

*   **Update Task (`PATCH /api/v1/tasks/{id}`)**
    *   Updates an existing task.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -X PATCH -d '{
          "name": "Updated Task Name",
          "duration": 90
        }' https://api.usemotion.com/api/v1/tasks/task_id_1
        ```
    *   **Request Body (JSON):**  Same fields as `POST /tasks`, but all are optional.
    *   **Response (Success - 200 OK):** Returns the updated task object.

*   **Delete Task (`DELETE /api/v1/tasks/{id}`)**
    *   Deletes a task.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" -X DELETE https://api.usemotion.com/api/v1/tasks/task_id_1
        ```
    *   **Response (Success - 204 No Content):**

*   **Task Statuses:**
    *   Statuses define the current state of a task. You can provide custom name to each status, but `type` is one of a set of predefined values.
     *   `TO_DO`:  The task is not yet started.
        *   `IN_PROGRESS`: The task is currently being worked on.
        *   `DONE`: The task has been completed.
        *   `CANCELED`: The task has been canceled.

*   **Task Priorities:**
    *   Priorities indicate the urgency of a task.
    *   `ASAP`:  As soon as possible.
    *   `HIGH`: High priority.
    *   `MEDIUM`: Medium priority (default).
    *   `LOW`: Low priority.
    *   `NO_PRIORITY`:  No specific priority.

*   **Task Types:**
    *   `TASK`: A standard task.
    *   `BOOKING`:  Represents a scheduled event or meeting.

---

**5. Schedules**
*   **Get Schedule (`GET /api/v1/schedules/{workspaceId}`)**
    *    Gets the schedule for the user in the given workspace. This is a read only view of the auto-scheduled tasks
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/schedules/yourWorkspaceId
        ```
    *   **Response (Success - 200 OK):**
    ```json
    [
        {
            "taskId": "string",
            "date": "2024-01-31",
            "startTime": "string",
            "endTime": "string",
            "timezone": "string"
        }
    ]
    ```

---
**6. Users**

*   **List Users (`GET /api/v1/users`)**
      * Retrieves a list of users within all accessible workspaces.
      *  **Request**
          ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/users
        ```
         ```bash
        curl -H "X-API-Key: YOUR_API_KEY" 'https://api.usemotion.com/api/v1/users?workspaceId=yourWorkspaceId'
        ```
      * **Response (Success - 200 OK):**
       ```json
        [
            {
                "id": "string",
                "createdTime": "2024-01-31T19:27:05.877Z",
                "email": "string",
                "name": "string",
                "profilePictureUrl": "string"
            }
        ]
        ```

*   **Get User (`GET /api/v1/users/{id}`)**
    *   Retrieves a single user by its ID.
    *   **Request:**
        ```bash
        curl -H "X-API-Key: YOUR_API_KEY" https://api.usemotion.com/api/v1/users/user_id_1
        ```
    *   **Response (Success - 200 OK):**
        ```json
        {
            "id": "string",
            "createdTime": "2024-01-31T19:27:05.877Z",
            "email": "string",
            "name": "string",
            "profilePictureUrl": "string"
        }
        ```

---

**7. Webhooks**

*   **Overview:** Webhooks allow you to receive real-time notifications about events that occur in Motion.  Instead of polling the API, Motion will send an HTTP POST request to a URL you specify whenever a relevant event happens.

*   **Creating Webhooks:**
    *   Webhooks are created through the Motion web application (Settings -> API Keys -> Webhooks).
    *   You'll need to provide:
        *   A name for the webhook.
        *   The URL where Motion should send the webhook requests (this must be a publicly accessible HTTPS endpoint).
        *   The specific events you want to subscribe to.
        * The workspace the webhook is for.

*   **Webhook Events:**
    *   Motion supports the following webhook events:
        *   `TASK_CREATED`
        *   `TASK_UPDATED`
        *   `TASK_DELETED`
        * `PROJECT_CREATED`
        * `PROJECT_UPDATED`
        * `PROJECT_DELETED`
    *   The webhook payload (the body of the POST request) will be a JSON object containing information about the event.  The structure of the payload will depend on the event type. The object that triggered the event is returned.

*   **Verifying Webhooks:**
    *   To ensure that webhook requests are genuinely from Motion, you should verify the signature included in the `X-Motion-Signature` header.
    *   **Verification Process:**
        1.  **Concatenate:** Combine the webhook secret (provided when you create the webhook), a dot (`.`), and the request body (as a raw string).
        2.  **HMAC-SHA256:**  Compute an HMAC-SHA256 hash of the concatenated string, using the webhook secret as the key.
        3.  **Hex Encode:** Convert the resulting hash to a hexadecimal string.
        4.  **Compare:**  Compare this generated signature with the value in the `X-Motion-Signature` header.  If they match, the request is valid.
    *   **Example (Conceptual - Python):**
        ```python
        import hmac
        import hashlib
        import json

        def verify_webhook(request_body, signature, webhook_secret):
            """Verifies a Motion webhook signature."""
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                msg=f"{webhook_secret}.{request_body}".encode('utf-8'),
                digestmod=hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)

        # Example usage (assuming you have the request body, signature, and secret)
        request_body = '{"event": "TASK_CREATED", ...}' # Raw request body
        signature = request.headers.get('X-Motion-Signature')
        webhook_secret = "your_webhook_secret"

        if verify_webhook(request_body, signature, webhook_secret):
            print("Webhook signature verified!")
            # Process the webhook payload...
        else:
            print("Webhook signature verification failed!")
        ```
    *   **Important Considerations:**
        *   **HTTPS:** Your webhook endpoint *must* use HTTPS.  Motion will not send webhooks to insecure HTTP endpoints.
        *   **Response Codes:** Your webhook endpoint should respond quickly (ideally within a few seconds) with a `2xx` status code to acknowledge receipt of the event.  Motion may retry sending the webhook if it doesn't receive a successful response.
        *   **Idempotency:**  Design your webhook handler to be idempotent.  This means that processing the same webhook event multiple times should have the same effect as processing it once.  This is important because Motion may occasionally send duplicate events.  You can use the event ID (if provided in the payload) to track which events you've already processed.
        *   **Security:** Protect your webhook secret.  Anyone with the secret can forge webhook requests.
        *   **Error Handling:** Implement robust error handling in your webhook handler.  Log errors and consider implementing retry logic for transient failures.

---

This document provides a comprehensive overview of the Motion API based on the provided documentation.  Remember to consult the official Motion API documentation for the most up-to-date information and any changes. I have included all endpoints, request/response examples, and crucial details like authentication, rate limiting, error handling, and webhook verification. I have also included details for all the request body parameters and query parameters based on the example.
