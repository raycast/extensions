# Webhooks

> Real-time notifications for task lifecycle events

## Overview

Webhooks allow you to receive real-time notifications when important events occur in your Manus tasks. When you register a webhook, Manus will send HTTP POST requests to your specified callback URL whenever these events are triggered.

## How Webhook Events Work

When you create and execute tasks, three key lifecycle events can trigger webhook deliveries:

- **Task Creation** (`task_created`): Sent **once** when a task is first created via the API
- **Task Progress** (`task_progress`): Sent multiple times as the task executes and updates its plan
- **Task Stopped** (`task_stopped`): Sent when a task completes or requires user input

### Typical Event Lifecycle

For a single task, you'll receive webhooks in this order:

1. **One** `task_created` event when the task is first created
2. **Multiple** `task_progress` events as the task executes and updates its plan (optional, may vary)
3. **One** `task_stopped` event when the task finishes or needs input

Each webhook delivery contains a specific event type identifier and a structured payload with relevant task information. Your endpoint will receive these as standard HTTP POST requests that you can process like any other API call.

## Setting Up Webhooks

<Card title="Manage Webhooks" horizontal arrow icon="wrench" href="http://manus.im/app?show_settings=integrations&app_name=api">
  Navigate to the API Integration settings to create or manage webhooks.
</Card>

Before activating a webhook, Manus will send a test request to verify your endpoint is accessible and responding correctly. Your endpoint should:

- Respond with HTTP status code 200
- Accept POST requests with JSON payloads
- Respond within 10 seconds

## Security Considerations

<Warning>
  Always validate webhook payloads in your application. Consider implementing signature verification or other security measures to ensure requests are coming from Manus.
</Warning>

## Event Types and Payloads

### `task_created` Event

**When it triggers:** Immediately after a new task is successfully created.

**Why it's useful:** Allows you to track task creation in your own systems, send confirmation emails, or update dashboards in real-time.

**Payload Schema:**

| Field        | Type   | Required | Description                              |
| ------------ | ------ | -------- | ---------------------------------------- |
| `event_id`   | string | Yes      | Unique identifier for this webhook event |
| `event_type` | string | Yes      | Always `"task_created"` for this event   |
| `task_id`    | string | Yes      | Unique identifier for the created task   |
| `task_title` | string | Yes      | Human-readable title of the task         |
| `task_url`   | string | Yes      | Direct URL to view the task in Manus app |

**Example Payload:**

```json theme={null}
{
  "event_id": "task_created_task_abc123",
  "event_type": "task_created",
  "task_detail": {
    "task_id": "task_abc123",
    "task_title": "Generate quarterly sales report",
    "task_url": "https://manus.im/app/task_abc123"
  }
}
```

### `task_progress` Event

**When it triggers:** Multiple times during task execution as the task updates its plan or makes progress.

**Why it's useful:** Enables real-time progress tracking, allowing you to show live updates to users or monitor task execution in detail.

**Payload Schema:**

| Field           | Type   | Required | Description                                      |
| --------------- | ------ | -------- | ------------------------------------------------ |
| `event_id`      | string | Yes      | Unique identifier for this webhook event         |
| `event_type`    | string | Yes      | Always `"task_progress"` for this event          |
| `task_id`       | string | Yes      | Unique identifier for the task                   |
| `progress_type` | string | Yes      | Type of progress update (e.g., `"plan_update"`)  |
| `message`       | string | Yes      | Description of the current progress or plan step |

**Progress Type Values:**

- `"plan_update"`: Task has updated its execution plan with a new step

**Example Payload:**

```json theme={null}
{
  "event_id": "task_progress_TeBim6FDQf9peS52xHtAyh_1764187289",
  "event_type": "task_progress",
  "progress_detail": {
    "task_id": "TeBim6FDQf9peS52xHtAyh",
    "progress_type": "plan_update",
    "message": "Generate the TypeScript \"hello world\" function code."
  }
}
```

### `task_stopped` Event

**When it triggers:** When a task reaches a stopping point - either because it completed successfully or needs user input to proceed.

**Why it's useful:** Essential for knowing when your tasks finish and what the outcome was. Enables automated workflows based on task completion.

**Payload Schema:**

| Field         | Type   | Required | Description                                 |
| ------------- | ------ | -------- | ------------------------------------------- |
| `event_id`    | string | Yes      | Unique identifier for this webhook event    |
| `event_type`  | string | Yes      | Always `"task_stopped"` for this event      |
| `task_id`     | string | Yes      | Unique identifier for the task              |
| `task_title`  | string | Yes      | Human-readable title of the task            |
| `task_url`    | string | Yes      | Direct URL to view the task in Manus app    |
| `message`     | string | Yes      | Status message from the task execution      |
| `attachments` | array  | No       | List of files generated by the task         |
| `stop_reason` | string | Yes      | Why the task stopped: `"finish"` or `"ask"` |

**Stop Reason Values:**

- `"finish"`: Task completed successfully and has final results
- `"ask"`: Task paused and requires user input or confirmation to continue

**Attachment Object Schema:**

| Field        | Type    | Required | Description                      |
| ------------ | ------- | -------- | -------------------------------- |
| `file_name`  | string  | Yes      | Name of the generated file       |
| `url`        | string  | Yes      | Secure download URL for the file |
| `size_bytes` | integer | Yes      | File size in bytes               |

**Example Payload (Task Completed):**

```json theme={null}
{
  "event_id": "task_created_task_abc123",
  "event_type": "task_stopped",
  "task_detail": {
    "task_id": "task_abc123",
    "task_title": "Generate quarterly sales report",
    "task_url": "https://manus.im/app/task_abc123",
    "message": "I've completed the quarterly sales report analysis. The report includes revenue trends, top-performing products, and regional breakdowns.",
    "attachments": [
      {
        "file_name": "q4-sales-report.pdf",
        "url": "https://s3.amazonaws.com/manus-files/reports/q4-sales-report.pdf",
        "size_bytes": 2048576
      },
      {
        "file_name": "sales-data.xlsx",
        "url": "https://s3.amazonaws.com/manus-files/reports/sales-data.xlsx",
        "size_bytes": 512000
      }
    ],
    "stop_reason": "finish"
  }
}
```

**Example Payload (User Input Required):**

```json theme={null}
{
  "event_id": "task_created_task_abc123",
  "event_type": "task_stopped",
  "task_detail": {
    "task_id": "task_abc123",
    "task_title": "Book restaurant reservation",
    "task_url": "https://manus.im/app/task_abc123",
    "message": "I found several restaurants with availability for your requested date and time. Which option would you prefer? 1) Bistro Milano - 7:00 PM, 2) Garden Terrace - 7:30 PM, 3) The Blue Door - 8:00 PM",
    "attachments": [],
    "stop_reason": "ask"
  }
}
```

## End-to-End Webhook Lifecycle Example

Here's what a complete webhook sequence looks like for a single task:

```json theme={null}
// 1. Task Created (sent once)
{
  "event_id": "task_created_TeBim6FDQf9peS52xHtAyh_1764187286",
  "event_type": "task_created",
  "task_detail": {
    "task_id": "TeBim6FDQf9peS52xHtAyh",
    "task_title": "Hello World Function in TypeScript",
    "task_url": "https://manus.im/app/TeBim6FDQf9peS52xHtAyh"
  }
}

// 2. Progress Update #1 (sent as task works)
{
  "event_id": "task_progress_TeBim6FDQf9peS52xHtAyh_1764187289",
  "event_type": "task_progress",
  "progress_detail": {
    "task_id": "TeBim6FDQf9peS52xHtAyh",
    "progress_type": "plan_update",
    "message": "Generate the TypeScript \"hello world\" function code."
  }
}

// 3. Progress Update #2 (sent as task continues)
{
  "event_id": "task_progress_TeBim6FDQf9peS52xHtAyh_1764187298",
  "event_type": "task_progress",
  "progress_detail": {
    "task_id": "TeBim6FDQf9peS52xHtAyh",
    "progress_type": "plan_update",
    "message": "Deliver the TypeScript code to the user."
  }
}

// 4. Task Stopped (sent once when complete)
{
  "event_id": "task_stopped_TeBim6FDQf9peS52xHtAyh_1764187304",
  "event_type": "task_stopped",
  "task_detail": {
    "task_id": "TeBim6FDQf9peS52xHtAyh",
    "task_title": "Hello World Function in TypeScript",
    "task_url": "https://manus.im/app/TeBim6FDQf9peS52xHtAyh",
    "message": "Here is the simple \"hello world\" function written in TypeScript...",
    "attachments": [
      {
        "file_name": "hello_world.ts",
        "url": "https://manus.im/files/hello_world.ts",
        "size_bytes": 108
      }
    ],
    "stop_reason": "finish"
  }
}
```

**Using Webhooks End-to-End:**

1. **Task Creation**: When you receive `task_created`, you can store the task ID in your database and show a "Task started" notification to your users.

2. **Progress Updates**: As `task_progress` events arrive, update a progress bar or activity log to show users what the AI is working on in real-time.

3. **Completion**: When `task_stopped` arrives with `stop_reason: "finish"`, you can:
   - Download any attachments from the URLs provided
   - Store the final message and results
   - Send completion notifications
   - Trigger downstream workflows

4. **User Input Needed**: If `task_stopped` arrives with `stop_reason: "ask"`, prompt the user with the message and collect their response to continue the task.

## Integration Examples

### Email Notifications via Zapier

Connect your webhook to Zapier to automatically send email notifications when tasks complete:

1. Create a Zapier webhook trigger
2. Use the webhook URL in your Manus webhook configuration
3. Set up email actions based on the `stop_reason` field

### Slack Integration

Post task updates directly to Slack channels:

```javascript theme={null}
// Example webhook handler for Slack integration
app.post("/manus-webhook", (req, res) => {
  const { task_title, message, stop_reason } = req.body;

  if (stop_reason === "finish") {
    // Post completion message to Slack
    slack.chat.postMessage({
      channel: "#ai-tasks",
      text: `✅ Task completed: ${task_title}\n${message}`,
    });
  }

  res.status(200).send("OK");
});
```

### Custom Dashboard Updates

Update your internal dashboards in real-time:

```python theme={null}
# Example webhook handler in Python/Flask
@app.route('/manus-webhook', methods=['POST'])
def handle_webhook():
    data = request.json

    # Update task status in your database
    update_task_status(
        task_id=data['task_id'],
        status='completed' if data['stop_reason'] == 'finish' else 'waiting',
        message=data['message']
    )

    return '', 200
```

## Troubleshooting

### Common Issues

- **Webhook not receiving events**: Verify your URL is accessible and returns 200 status
- **SSL/TLS errors**: Ensure your endpoint uses valid HTTPS certificates
- **Timeout errors**: Make sure your endpoint responds within 10 seconds

### Testing Your Webhook

You can test your webhook endpoint using tools like:

- [webhook.site](https://webhook.site) for quick testing
- [ngrok](https://ngrok.com) for local development
- Postman or curl for manual testing

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://open.manus.ai/docs/llms.txt
