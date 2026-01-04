# Create File

> Creates a file record and returns a presigned URL for uploading the file content to S3.

Creates a file record and returns a presigned URL for uploading the file content to S3. After receiving the upload URL, use a PUT request to upload your file content.

The file can then be referenced in task attachments using the returned `file_id`.

## OpenAPI

```yaml POST /v1/files
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
    post:
      summary: CreateFile
      description: >-
        Creates a file record and returns a presigned URL for uploading the file
        content to S3.
      operationId: openapi.v1.OpenapiOauthService.CreateFile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                filename:
                  type: string
                  description: Name of the file to upload
              required:
                - filename
      responses:
        "200":
          description: File record created successfully.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FileCreate"
components:
  schemas:
    FileCreate:
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
          description: Initial status is "pending"
        upload_url:
          type: string
          description: Presigned S3 URL for uploading the file content (PUT request)
        upload_expires_at:
          type: string
          format: date-time
          description: ISO 8601 timestamp when the upload URL expires
        created_at:
          type: string
          format: date-time
          description: ISO 8601 timestamp when the file record was created
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
