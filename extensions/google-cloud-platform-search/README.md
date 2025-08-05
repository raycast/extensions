# Google Cloud Platform Search

## Commands

### Search Projects

Search projects in your GPC organization, and open the Dashboard overview in the Google Cloud Console.
Moreover, you can browse the available products in the Console and open them in the browser.

Note that the projects are queried using the [Resource Manager API](https://cloud.google.com/resource-manager/docs),
which is free and has no quota limits.

### Search Documentation Products

Search the available products in Google Cloud, and open the documentation link.

## Configuration

To correctly use _Search Projects_, you need to:

- Install `gcloud` locally: https://cloud.google.com/sdk
- Save the authentication locally: `gcloud auth application-default login`

### Skip 'sys-' prefixed projects
If you want to skip projects with a 'sys-' prefix, which are automatically generated with a new App Script project in Google Workspace, you can enable this option in the extension settings.
