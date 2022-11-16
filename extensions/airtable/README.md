# Airtable Raycast Extension

This [Raycast](https://www.raycast.com/) Extension uses [Airtable](https://www.airtable.com)'s (beta as of November 2022) [OAuth support](https://airtable.com/developers/web/guides/oauth-integrations) to allow a user to browse the bases, tables, fields, and views they granted the application access to (a part of the Airtable OAuth flow).

The following GIF and screenshots show the functionality of this extension.

 [_Click here to skip past the screenshots to local setup instructions_](#local-setup-and-development).

| Description | Preview |
|---|---|
| 20 second GIF (.mov) showing functionality highlights ([.mov version](./metadata/video-demo-20-seconds.mov)) | [![20 second video](./metadata/video-demo-20-seconds.gif)](./metadata/video-demo-20-seconds.gif) |
| List/filter bases | [![List/filter bases](./metadata/screenshot-0-list-all-bases.png)](./metadata/screenshot-0-list-all-bases.png) |
| Deep link into API docs from list of bases | [![Deep link into API docs from list of bases](./metadata/screenshot-1-open-api-docs-for-base.png)](./metadata/screenshot-1-open-api-docs-for-base.png) |
| List/filter a base's tables | [![List/filter a base's tables](./metadata/screenshot-2-browse-list-of-tables.png)](./metadata/screenshot-2-browse-list-of-tables.png) |
| Preview base details including a list of tables, fields, and links to open the base and API docs in your browser | [![Preview base details including a list of tables, fields, and links to open the base and API docs in your browser](./metadata/screenshot-2c-base-details-view.png)](./metadata/screenshot-2c-base-details-view.png) |
| List/filter a table's fields and copy/paste field IDs (similar functionality is available for a table's views) | [![List/filter a table's fields and copy/paste field IDs](./metadata/screenshot-3-list-fields-and-copy-id.png)](./metadata/screenshot-3-list-fields-and-copy-id.png) |

---

The software made available from this folder is not supported by Formagrid Inc (Airtable) or part of the Airtable Service. It is made available on an "as is" basis and provided without express or implied warranties of any kind.

---

## Local setup and development

### A. How to install this extension

At this time, this extension has not been published to the Raycast Extension Store. You'll need to follow the directions below to install it:

1. Clone or download this repository
2. Open the `Import Extension` command in Raycast and select the folder from step 1

### B. How to configure/setup this extension

The following steps are only required the first time you try to use the application:

1. Open the `List Airtable Bases` command in Raycast
2. Click `Sign in with Airtable` to securely connect the Raycast extension to your Airtable account using OAuth
3. Follow the Airtable OAuth flow to authorize the Raycast extension to access `All current and future bases in all current and future workspaces`. You can choose only a specific workspace if you'd like.
4. You should be redirected by to Raycast and see a success message. After a few seconds, you will be sent to the result of the `List Airtable Bases` command you originally requested (and you can now use that command directly without going through these setup/configuration seteps)


## Acknowledgement/Thank yous

Many thanks to the following resources and people:

- [Raycast OAuth extension examples](https://github.com/raycast/extensions/tree/main/examples/api-examples)
- [Raycast Slack community](https://www.raycast.com/community)
- Airtable Developer Platform & Ecosystem team
- @marks and @SeanKeenan-at built this extension