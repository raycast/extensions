# Paperless-ngx extension for Raycast launcher on Mac

A simple extension to query a self-hosted instance of [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) for uploaded documents using the API. The only follow-up action currently implemented is to directly open the document page in a browser.

Additional functionality like thumbnail previews, editing of metadata etc. could be implemented.

To use the extension, simply create a custom extension using the developer tools within Raycast and copy the repository in the extension folder. The extension makes use of Raycast's preferences API to maintain your self-hosted URL and API token, which can be obtained from Paperless-ngx's admin panel.
