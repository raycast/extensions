# Get Task

> Retrieves details of a specific task by ID.

Retrieve detailed information about a specific task by its ID. This includes the task's status, output messages, credit usage, and metadata.

Use the `convert` query parameter to convert pptx files in the task output.

## OpenAPI

```yaml GET /v1/tasks/{task_id}
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
  /v1/tasks/{task_id}:
    get:
      summary: GetTask
      description: Retrieves details of a specific task by ID.
      operationId: openapi.v1.OpenapiOauthService.GetTask
      parameters:
        - name: task_id
          in: path
          required: true
          schema:
            type: string
            description: The ID of the task to retrieve
        - name: convert
          in: query
          schema:
            type: boolean
            default: false
            description: >-
              Whether to convert the task output. Currently only applies for
              pptx files.
      responses:
        "200":
          description: Task retrieved successfully.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Task"
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
