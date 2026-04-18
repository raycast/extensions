# Vikunja Self-Hosted Raycast Extension

Raycast extension for your self-hosted Vikunja instance using API token authentication.

The OpenAPI document fetched from the provided instance is saved at [docs/vikunja-openapi.json](/Users/khotwani/scripts/raycast-extensions/vikunja-self-hosted/docs/vikunja-openapi.json).

## Preferences

- `baseUrl`: your Vikunja instance URL
- `apiToken`: Vikunja API token, sent as `Authorization: Bearer <token>`

## Setup

1. Open the extension folder in Raycast:
   [vikunja-self-hosted](/Users/khotwani/scripts/raycast-extensions/vikunja-self-hosted)
2. Run `npm install`.
3. In Raycast, open the extension preferences and set `baseUrl`.
4. Set `apiToken`.

## Commands

- `Tasks`: combined task browser with a `Cmd+P` view picker for overview, assigned tasks, today, and direct project views. It remembers the last selected view, supports `Cmd+N` to create in the current project context, `Cmd+E` to edit a task, and a remembered hide-completed toggle that filters tasks client-side.
- `Create Task`: full task form with title, description, project, due date, priority, and labels. It remembers the last used project and priority, but intentionally clears title, description, due date, and labels each time.

## Documented Endpoints Used

- `GET /user`
  Used to fetch the current user and `settings.default_project_id`.
- `GET /projects`
  Used to list accessible projects for task browsing and task creation/editing.
- `PUT /projects/{id}/tasks`
  Used to create a task in a specific project.
- `GET /tasks`
  Used to list tasks across accessible projects.
- `GET /tasks/{id}`
  Used before updates so field changes are applied to a documented task payload shape.
- `POST /tasks/{id}`
  Used to update task status, title, description, project, due date, and priority.
- `DELETE /tasks/{id}`
  Used to delete tasks.
- `GET /labels`
  Used to list accessible labels for the task creation form.
- `POST /tasks/{taskID}/labels/bulk`
  Used to assign labels after task creation and editing.

## Notes

- Authentication is API-token based only. No username/password flow is implemented.
- `401` responses are surfaced as `Invalid API token` and instruct the user to regenerate the token.
- The task list endpoint documents a `filter` query, but the OpenAPI document does not define the filter syntax inline. The `Tasks` command therefore uses documented task fields and client-side date filtering for its `Today` view rather than inventing filter expressions.
- `Open Task in Browser` uses the documented `GET /info` `frontend_url` from the hosted instance and opens the task at `/tasks/{id}`, which matches Vikunja's task page URLs.
