# TeslaMate <img src="https://raw.githubusercontent.com/teslamate-org/teslamate/a15631f2ff18b99023d562897de0f56ee3c38c0b/website/static/img/logo.svg" alt="drawing" width="40"/>

Raycast Extension to retrieve info about your Tesla from your TeslaMate instance.

## How to get started?

You need the following to get started

- A running <a href="https://github.com/teslamate-org/teslamate">TeslaMate</a> instace
- Service Account Token for your Grafana instance
- UID of datasource in Grafana

### How to create Service Account Token for Grafana

1. Go to your Grafana instance
2. In the left menubar click on <b>Users and access</b>
3. Click on <b>Service accounts</b>
4. Click on <b>Add service account</b>
5. Choose any <b>Display name</b> for your service account
6. Set service account <b>role</b> to <b>Viewer</b>
7. Click on <b>Create</b>
8. Click on <b>Add service account token</b>
9. Choose any <b>Display name</b> for your service account token
10. Set <b>Expiration</b> to <b>No expiration</b>
11. Copy your token to the TeslaMate Raycast Extension 🎉

### How to get the UID of the datasource

1. Go to your Grafana instance
2. In the left menubar click on <b>Connections -> Data sources</b>
3. Click on the DB <b>TeslaMate PostgreSQL</b>
4. The URL should now show something like <your-domain>/connections/edit/<b>Pxxxxxxxxx</b>
5. The <b>Pxxxxxxxxx</b> is the UID of your data source - copy it to the TeslaMate Raycast Extension 🎉

## Todo

- Drives Command (Show latest drives info)
- Add charging cost to charges command
- Get locking and sentry state (if possible from the db)
- ....
