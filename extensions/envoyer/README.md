# Envoyer

Search for envoyer projects, start new deploys and view recent deployments

## Features

- Search for projects
- Start new deployments
- View recent deployments

## How to get the access token for the Envoyer API

- Go to your [Envoyer dashboard](https://envoyer.io/dashboard) and log in if you haven't already
- Click on your avatar image in the right upper corner
- Click on `Account`
- Click on `API` on the left sidebar
- Give your token a name e.g. `raycast`
- Select your scope of choice

  When you want to start new deployments via raycast, you should allow `deployments:create`. No additional scopes are
  required.

- Store the given access token in a secret box because Envoyer won't show you the key again
- Go to the preferences in Raycast (or start any command of the Envoyer extension)
- Set the token from the previous step into the `Envoyer API key` field

Now you should be able to manage your Envoyer projects with Raycast 🚀.

## API Token/Personal Access Token scope

For all read only commands no scopes are needed. If you want to start new deployments you should
allow `deployments:create` scope.

