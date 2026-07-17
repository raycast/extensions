# Paperform

View forms and submissions from Paperform.

## Setup

1. Install the extension in Raycast (develop locally with `npm run dev`).
2. Open the command “List Paperform Forms”.
3. When prompted, paste your API key.
   - Generate an API key at: https://paperform.co/account/developer

## Usage

- Search your forms in the list. Selecting a form opens its submissions inside Raycast.
- Extra actions on a form:
  - Submissions: https://paperform.co/submissions/{slug}
  - View: https://{slug}.paperform.co
  - Edit: https://paperform.co/edit/{slug}

### Submissions

- The submissions view lists submission IDs with created time.
- Selecting a submission opens it in the browser:
  - https://paperform.co/submissions/{slug}/inbox?selected_submission_id={submission_id}

## Notes

- API base: https://api.paperform.co/v1
- Handles 401 (unauthorized) and 429 (rate limited) with toasts.

References: [Raycast docs](https://developers.raycast.com) · [Paperform API](https://paperform.readme.io/reference/getting-started-1)
