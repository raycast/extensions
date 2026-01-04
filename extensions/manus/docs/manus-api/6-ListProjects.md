# List Projects

> Retrieves a list of all projects in your account.

Retrieve a list of all projects in your account with optional pagination.

## Query Parameters

- **limit**: Maximum number of projects to return (default: 100, range: 1-1000)

## Example Request

```bash theme={null}
curl -X GET "https://api.manus.ai/v1/projects?limit=100" \
  -H "API_KEY: your-api-key"
```

## Example Response

```json theme={null}
{
  "data": [
    {
      "id": "proj_abc123",
      "name": "My Research Project",
      "instruction": "You must always cite your sources",
      "created_at": 1699900000
    },
    {
      "id": "proj_def456",
      "name": "Customer Support",
      "instruction": "Be friendly and helpful",
      "created_at": 1699800000
    }
  ]
}
```

## OpenAPI

```yaml GET /v1/projects
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
    get:
      summary: ListProjects
      description: Retrieves a list of all projects in your account.
      operationId: openapi.v1.OpenapiOauthService.ListProjects
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            format: int32
            description: "Maximum number of projects to return. Default: 100, Range: 1-1000."
      responses:
        "200":
          description: Projects retrieved successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
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
