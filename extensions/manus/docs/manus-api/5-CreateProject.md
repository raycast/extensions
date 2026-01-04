# Create Project

> Creates a new project to organize tasks and apply consistent instructions.

Create a new project to organize tasks and apply consistent instructions across multiple tasks.

## Request Body

| Field         | Type   | Required | Description                                                           |
| ------------- | ------ | -------- | --------------------------------------------------------------------- |
| `name`        | string | Yes      | The name of the project                                               |
| `instruction` | string | No       | Default instruction that will be applied to all tasks in this project |

## Example Request

```bash theme={null}
curl -X POST "https://api.manus.ai/v1/projects" \
  -H "Content-Type: application/json" \
  -H "API_KEY: your-api-key" \
  -d '{
    "name": "Research Project",
    "instruction": "You must start every response with a summary of key findings"
  }'
```

## Example Response

```json theme={null}
{
  "id": "proj_abc123",
  "name": "Research Project",
  "instruction": "You must start every response with a summary of key findings",
  "created_at": 1699900000
}
```

## Using Projects with Tasks

Once you've created a project, you can assign tasks to it by including the `project_id` in your task creation request:

```bash theme={null}
curl -X POST "https://api.manus.ai/v1/tasks" \
  -H "Content-Type: application/json" \
  -H "API_KEY: your-api-key" \
  -d '{
    "prompt": "Analyze this data",
    "agent_profile": "manus-1.6",
    "project_id": "proj_abc123"
  }'
```

The project's instruction will be automatically applied to all tasks created within that project.

## OpenAPI

```yaml POST /v1/projects
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
  /v1/projects:
    post:
      summary: CreateProject
      description: >-
        Creates a new project to organize tasks and apply consistent
        instructions.
      operationId: openapi.v1.OpenapiOauthService.CreateProject
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the project
                instruction:
                  type: string
                  description: >-
                    Default instruction that will be applied to all tasks in
                    this project
              required:
                - name
      responses:
        "200":
          description: Project created successfully.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Project"
components:
  schemas:
    Project:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier for the project
        name:
          type: string
          description: Name of the project
        instruction:
          type: string
          description: Default instruction applied to all tasks in this project
        created_at:
          type: integer
          format: int64
          description: Unix timestamp (seconds) when the project was created
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
