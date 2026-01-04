# List Files

> Retrieves a list of the 10 most recently uploaded files.

Retrieves a list of the 10 most recently uploaded files.

## OpenAPI

```yaml GET /v1/files
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
  /v1/files:
    get:
      summary: ListFiles
      description: Retrieves a list of the 10 most recently uploaded files.
      operationId: openapi.v1.OpenapiOauthService.ListFiles
      responses:
        "200":
          description: Files retrieved successfully.
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
                      $ref: "#/components/schemas/File"
                    description: Array of file objects (max 10)
components:
  schemas:
    File:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier for the file
        object:
          type: string
          description: Always "file"
        filename:
          type: string
          description: Name of the file
        status:
          type: string
          enum:
            - pending
            - uploaded
            - deleted
          description: Current status of the file
        created_at:
          type: string
          format: date-time
          description: ISO 8601 timestamp when the file was created
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
