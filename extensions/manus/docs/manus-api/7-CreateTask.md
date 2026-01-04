# Create Task

> Creates a new task.

We support creating tasks using various connectors, click [here](../connectors) to find out more

## OpenAPI

```yaml POST /v1/tasks
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
    post:
      summary: CreateTask
      description: Creates a new task.
      operationId: openapi.v1.OpenapiOauthService.CreateTask
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                prompt:
                  type: string
                  title: prompt
                  description: The task prompt or instruction for the Manus agent.
                  example: Write a function to calculate fibonacci numbers
                attachments:
                  type: array
                  items:
                    oneOf:
                      - type: object
                        title: File ID Attachment
                        properties:
                          filename:
                            type: string
                            description: Name of the file attachment
                          file_id:
                            type: string
                            description: >-
                              ID of a previously uploaded file (via POST
                              /v1/files)
                        required:
                          - filename
                          - file_id
                      - type: object
                        title: URL Attachment
                        properties:
                          filename:
                            type: string
                            description: Name of the file attachment
                          url:
                            type: string
                            description: Publicly accessible URL to a file or image
                          mimeType:
                            type: string
                            description: MIME type of the file (optional)
                        required:
                          - filename
                          - url
                      - type: object
                        title: Base64 Data Attachment
                        properties:
                          filename:
                            type: string
                            description: Name of the file attachment
                          fileData:
                            type: string
                            description: >-
                              Base64 encoded file/image data in format:
                              'data:<mime_type>;base64,<encoded_content>'
                        required:
                          - filename
                          - fileData
                  title: attachments
                  description: >-
                    Array of file/image attachments. No distinction between
                    files and images - both are treated the same way.
                taskMode:
                  type: string
                  enum:
                    - chat
                    - adaptive
                    - agent
                  title: task_mode
                  description: chat, adaptive or agent
                connectors:
                  type: array
                  items:
                    type: string
                  title: connectors
                  description: >-
                    List of connector IDs to enable for this task. Only
                    connectors already configured in the user's account can be
                    used.
                hideInTaskList:
                  type: boolean
                  title: hide_in_task_list
                  description: >-
                    Whether to hide this task from the Manus webapp task list.
                    The task will still be accessible via the provided link.
                createShareableLink:
                  type: boolean
                  title: create_shareable_link
                  description: >-
                    Whether to make the chat publicly accessible to others on
                    the Manus website.
                taskId:
                  type: string
                  title: task_id
                  description: For continuing existing tasks (multi-turn)
                agentProfile:
                  type: string
                  enum:
                    - manus-1.6
                    - manus-1.6-lite
                    - manus-1.6-max
                  title: agent_profile
                  description: manus-1.6, manus-1.6-lite, or manus-1.6-max
                  default: manus-1.6
                locale:
                  type: string
                  title: locale
                  description: >-
                    Your default locale that you've set on Manus (e.g., "en-US",
                    "zh-CN")
                projectId:
                  type: string
                  title: project_id
                  description: >-
                    ID of the project to associate this task with. The project's
                    instruction will be applied to the task.
                interactiveMode:
                  type: boolean
                  title: interactive_mode
                  description: >-
                    Enable interactive mode to allow Manus to ask follow-up
                    questions when input is insufficient. Default: false (no
                    follow-up questions).
              required:
                - prompt
                - agentProfile
              additionalProperties: false
              example:
                prompt: Write a function to calculate fibonacci numbers
                agentProfile: manus-1.6
      responses:
        "200":
          description: Task created successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  task_id:
                    type: string
                    title: task_id
                  task_title:
                    type: string
                    title: task_title
                  task_url:
                    type: string
                    title: task_url
                  share_url:
                    type: string
                    title: share_url
                    description: >-
                      Optional publicly accessible link to the chat. Only
                      present if create_shareable_link was set to true.
                additionalProperties: false
components:
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
