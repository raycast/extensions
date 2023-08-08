# Raycast GitHub Projects

Show recently viewed and updated GitHub projects.

   <img width="600" alt="image" src="https://github-production-user-asset-6210df.s3.amazonaws.com/113158/258975363-45af24bc-8898-405c-8d30-52e70eb492d2.jpg">

## Setup

1. Install the extension from https://www.raycast.com/skw/raycast-github-projects
2. Launch the `Show GitHub Projects` command. The first time any of the commands are launched, you'll be prompted to a provide a PAT token with project permissions, and the repo you'd like to use. **Note** Currently the GraphQL API (which this extension uses) does not support fine-grained PATs. You must provide a Classic token with `repo` scope.

That's it!

## Commands

### `Show GitHub Projects`

- Browse recently-viewed and updated GitHub Projects and Project views. When a project or view is opened a timestamp is saved locally and used to populate a list of recently-viewed items.

#### Actions

- Open Project
- Open View
  - Allows opening a project's view, which is then saved in recently-viewed items
