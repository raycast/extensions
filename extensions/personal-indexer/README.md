# Personal Indexer for Raycast

Search the local indexer from Raycast. The service listens on `http://127.0.0.1:3921`. On macOS it can start at login with `./service/scripts/install-agent.sh` from the repo, after `npm run build --prefix service`. If it is down, Search Files explains how to start it.

To choose directories: open [http://127.0.0.1:3921/config](http://127.0.0.1:3921/config), then **Choose folder…**. If the dialog is unavailable, paste an absolute path on that page. **Add Folder** is the Raycast directory picker and posts the same API.

This folder shows up as a development extension when Raycast imported it through `npx ray develop` or Import Extension. Raycast only treats Store installs as non-development extensions. `npx ray build` and `npx ray bundle` do not install it that way.

Quit `npx ray develop` if it is running. Remove the development copy in Raycast → Settings → Extensions → Personal Indexer → Remove. To install it as a normal extension, sign in and run `npx ray publish` from this directory. That publishes to the Raycast Store, or to an organization private store if the extension is private. That command was not run here. It needs your Raycast account.

Use `npx ray develop` only while changing this extension. It reloads on save and keeps the development badge.

Commands: Search Files, Indexer Status, Add Folder.

Preferences:

- **Service URL** defaults to `http://127.0.0.1:3921`.
- **Service Directory** is optional. When it is set, Indexer Status can start `npm run service` in that repo.

The first search can take a couple of minutes while the service downloads and loads the local embedding model. Later searches are quicker. Tags such as `immigration` show on each result when the document matches that topic.
