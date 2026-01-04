# Update Task

> Updates a task's metadata.

Update a task's metadata such as title, sharing settings, and visibility in the task list.

## Updatable Fields

- **title**: Change the task's title
- **enableShared**: Enable or disable public sharing of the task
- **enableVisibleInTaskList**: Control whether the task appears in the Manus webapp task list

## OpenAPI

```yaml PUT /v1/tasks/{task_id}
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
    put:
      summary: UpdateTask
      description: Updates a task's metadata.
      operationId: openapi.v1.OpenapiOauthService.UpdateTask
      parameters:
        - name: task_id
          in: path
          required: true
          schema:
            type: string
            description: The ID of the task to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                  description: New title for the task
                enableShared:
                  type: boolean
                  description: Whether to enable public sharing
                enableVisibleInTaskList:
                  type: boolean
                  description: Whether the task should be visible in the task list
              additionalProperties: false
      responses:
        "200":
          description: Task updated successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  task_id:
                    type: string
                  task_title:
                    type: string
                  task_url:
                    type: string
                  share_url:
                    type: string
                    description: Public share URL if sharing is enabled
components:
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
