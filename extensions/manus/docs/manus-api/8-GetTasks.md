# Get Tasks

> Retrieves a list of tasks with optional filtering and pagination.

Retrieve a list of tasks with optional filtering and pagination. This endpoint allows you to search, filter, and paginate through your tasks.

## Query Parameters

Use these parameters to filter and paginate through tasks:

- **after**: Cursor for pagination (ID of the last task from previous page)
- **limit**: Maximum number of tasks to return (default: 100, range: 1-1000)
- **order**: Sort direction - "asc" or "desc" (default: "desc")
- **orderBy**: Sort field - "created_at" or "updated_at" (default: "created_at")
- **query**: Search term to filter by title and body content
- **status**: Array of status values to filter by - "pending", "running", "completed", "failed"
- **createdAfter**: Unix timestamp to filter tasks created after this time
- **createdBefore**: Unix timestamp to filter tasks created before this time
- **project_id**: Filter tasks by project ID - returns only tasks belonging to the specified project

## OpenAPI

```yaml GET /v1/tasks
openapi: 3.1.0
info:
  title: Manus Integrations API
  description: API for integrating Manus into your workflow.
  version: 1.0.0
servers:
  - url: https://api.manus.ai
security:
  - bearerAuth: []
paths:
  /v1/tasks:
    get:
      summary: GetTasks
      description: Retrieves a list of tasks with optional filtering and pagination.
      operationId: openapi.v1.OpenapiOauthService.GetTasks
      parameters:
        - name: after
          in: query
          schema:
            type: string
            description: Cursor for pagination. ID of the last task from the previous page.
        - name: limit
          in: query
          schema:
            type: integer
            format: int32
            description: "Maximum number of tasks to return. Default: 100, Range: 1-1000."
        - name: order
          in: query
          schema:
            type: string
            description: 'Sort direction: "asc" or "desc". Default: "desc".'
        - name: orderBy
          in: query
          schema:
            type: string
            description: 'Sort field: "created_at" or "updated_at". Default: "created_at".'
        - name: query
          in: query
          schema:
            type: string
            description: Search term to filter by title and body content.
        - name: status
          in: query
          schema:
            type: array
            items:
              type: string
            description: >-
              Filter by task status: "pending", "running", "completed",
              "failed".
        - name: createdAfter
          in: query
          schema:
            type: integer
            format: int64
            description: Filter tasks created after this Unix timestamp (seconds).
        - name: createdBefore
          in: query
          schema:
            type: integer
            format: int64
            description: Filter tasks created before this Unix timestamp (seconds).
        - name: project_id
          in: query
          schema:
            type: string
            description: >-
              Filter tasks by project ID. Returns only tasks belonging to the
              specified project.
      responses:
        "200":
          description: Tasks retrieved successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  object:
                    type: string
                    description: Always "list"
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Task"
                  first_id:
                    type: string
                    description: ID of the first task in the list
                  last_id:
                    type: string
                    description: >-
                      ID of the last task in the list (use as 'after' for next
                      page)
                  has_more:
                    type: boolean
                    description: Whether there are more tasks available
components:
  schemas:
    Task:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier for the task
        object:
          type: string
          description: Always "task"
        created_at:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the task was created
        updated_at:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the task was last updated
        status:
          type: string
          enum:
            - pending
            - running
            - completed
            - failed
          description: Current status of the task
        error:
          type: string
          description: Error message if the task failed (optional)
        incomplete_details:
          type: string
          description: Details about why the task is incomplete (optional)
        instructions:
          type: string
          description: The original prompt/instructions for the task (optional)
        max_output_tokens:
          type: integer
          format: int32
          description: Maximum output tokens limit (optional)
        model:
          type: string
          description: Model used for the task
        metadata:
          type: object
          properties:
            task_title:
              type: string
              description: Title of the task
            task_url:
              type: string
              description: >-
                URL to view the task in Manus app (e.g.,
                https://manus.im/app/cvL57MT3sh2McZRjTog8MZ)
          additionalProperties:
            type: string
          description: >-
            Metadata containing task information and optional custom key-value
            pairs
        output:
          type: array
          items:
            $ref: "#/components/schemas/TaskMessage"
          description: Array of task messages (conversation history)
        locale:
          type: string
          description: User's preferred locale (optional)
        credit_usage:
          type: integer
          format: int32
          description: Credits consumed by this task (optional)
    TaskMessage:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier for the message
        status:
          type: string
          description: Status of the message
        role:
          type: string
          enum:
            - user
            - assistant
          description: Role of the message sender - "assistant" or "user"
        type:
          type: string
          description: Type here is "message"
        content:
          type: array
          items:
            $ref: "#/components/schemas/MessageContent"
          description: Array of message content items (text or files)
    MessageContent:
      type: object
      properties:
        type:
          type: string
          enum:
            - output_text
            - output_file
          description: Content type - "output_text" or "output_file"
        text:
          type: string
          description: Text content (for output_text type)
        fileUrl:
          type: string
          description: File URL (for output_file type)
        fileName:
          type: string
          description: File name (for output_file type)
        mimeType:
          type: string
          description: MIME type of the file (for output_file type)
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
