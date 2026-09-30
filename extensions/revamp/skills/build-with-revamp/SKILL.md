---
name: build-with-revamp
description: Create or redesign a website or web app with Revamp, or refine an existing Revamp project, when the user wants actual project work rather than advice alone.
---

# Build with Revamp

Use the connected Revamp tools to turn the customer's request into a project they can preview and continue editing. Keep the conversation in plain language.

1. Choose the action from the customer's goal: an existing public website URL to redesign → `start_website_redesign`; a new website → `start_new_website`; a new interactive web app → `start_web_app`; changes to an existing Revamp project → `list_projects` if its ID is unknown, then `refine_project`. If the customer names an agency client folder, resolve it with `list_clients` before using its `clientId`. Do not create a new project for an edit to an existing one.
2. Ask for a missing public URL before starting a redesign. For a new project, ask a short outcome-level question only when there is no useful brief. Do not invent a URL, project, client, or requested feature. If multiple existing projects match, ask which one to change.
3. For each new start or refinement, use a fresh UUID as `requestId`. If retrying the *same* request after an uncertain response, reuse that UUID; never submit a second project or edit merely because the first is still running.
4. Use the returned `projectId` and `submissionId` with `check_project`; continue checking while practical until that submission finishes. A submitted or completed agent turn is not, by itself, a ready preview. Read `status` and `reply`; `previewUrl` is the latest available preview and can predate a requested edit. If the new preview is not established, call it the latest available preview rather than claiming the edit is visible. Report a still-running turn or a tool error plainly. Do not promise a completion time or an automatic follow-up.
5. Tell the customer what happened and provide the preview URL when ready. Offer `studioUrl` for visual review or further changes; opening Studio is not required to start or follow the work. A preview is not a published website. Do not claim publishing, rankings, traffic, or functionality that the tool result does not establish.

Use Revamp only for requests to create, redesign, inspect, or change Revamp projects. For copy ideas, general advice, comparisons, or help with another hosting platform, answer the request without starting a Revamp project.
