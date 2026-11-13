# Portless

Manage your [Portless](https://port1355.dev/) routes from Raycast. Instantly view active routes and their assigned ports.

The extension runs `portless list`, resolving `portless` from `PATH`. If Portless is installed inside a project rather than globally, use the **Portless Executable** preference to pick the package's executable, typically `node_modules/portless/dist/cli.js`.

Pressing Enter on a route copies its URL and Cmd+Enter opens it in the browser. Set the **Primary Action** preference to **Open in Browser** to swap the two.
