# Create Webhook

> Creates a new webhook.

## OpenAPI

```yaml POST /v1/webhooks
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
  /v1/webhooks:
    post:
      summary: CreateWebhook
      description: Creates a new webhook.
      operationId: openapi.v1.OpenapiOauthService.CreateWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                webhook:
                  type: object
                  properties:
                    url:
                      type: string
                  required:
                    - url
              required:
                - webhook
      responses:
        "200":
          description: Webhook created successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  webhook_id:
                    type: string
components:
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
