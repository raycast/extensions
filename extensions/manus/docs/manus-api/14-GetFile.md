# Get File

> Retrieves details of a specific file by ID.

Retrieves details of a specific file by ID, including its status and metadata.

## OpenAPI

```yaml GET /v1/files/{file_id}
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
  /v1/files/{file_id}:
    get:
      summary: RetrieveFile
      description: Retrieves details of a specific file by ID.
      operationId: openapi.v1.OpenapiOauthService.RetrieveFile
      parameters:
        - name: file_id
          in: path
          required: true
          schema:
            type: string
            description: The ID of the file to retrieve
      responses:
        "200":
          description: File retrieved successfully.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/File"
        "404":
          description: File not found or has been deleted.
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    example: 5
                  message:
                    type: string
                    example: file not found or has been deleted
                  details:
                    type: array
                    items: {}
                    example: []
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
