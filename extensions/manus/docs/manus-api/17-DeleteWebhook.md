# Delete Webhook

> Deletes a webhook.

## OpenAPI

```yaml DELETE /v1/webhooks/{webhook_id}
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
  /v1/webhooks/{webhook_id}:
    delete:
      summary: DeleteWebhook
      description: Deletes a webhook.
      operationId: openapi.v1.OpenapiOauthService.DeleteWebhook
      parameters:
        - name: webhook_id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Webhook deleted successfully.
components:
  securitySchemes:
    bearerAuth:
      type: apiKey
      in: header
      name: API_KEY
```

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
