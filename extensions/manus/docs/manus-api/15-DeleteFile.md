# Delete File

> Deletes a file by ID. This removes both the file record and the file from S3 storage.

Deletes a file by ID. This removes both the file record and the file from S3 storage.

## OpenAPI

```yaml DELETE /v1/files/{file_id}
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
    delete:
      summary: DeleteFile
      description: >-
        Deletes a file by ID. This removes both the file record and the file
        from S3 storage.
      operationId: openapi.v1.OpenapiOauthService.DeleteFile
      parameters:
        - name: file_id
          in: path
          required: true
          schema:
            type: string
            description: The ID of the file to delete
      responses:
        "200":
          description: File deleted successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    description: The ID of the deleted file
                  object:
                    type: string
                    description: Always "file.deleted"
                  deleted:
                    type: boolean
                    description: Always true if successful
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
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
