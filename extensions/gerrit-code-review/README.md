# Gerrit Code Review

## About

This extension allows browsing and viewing Gerrit projects and changes using the REST API endpoint.

Multiple Gerrit instances are supported.

In the current scope of the extension, no plans to support reviewing/voting/submitting and any operations that modify
entities in Gerrit.  
The extension aims to provide information at a glance, especially if working with multiple instances.  
Users should keep using the web interface to modify Gerrit entities.

Users can provide an `username`+`HTTP password` to authenticate with API to get personalized info when possible.

This plugin was tested on instances `=> 3.5.4`.

## Commands

### `Browse Projects`

Query projects hosted on the Gerrit instance.  
Fetches default amount of projects configured by instance.

Caveat: If attempting to fetch all projects with their details (`<API_ENDPOINT>/projects/?d&all`), in larger instances we
could exceed the memory heap size when attempting to display all projects.  
For example, `review.gerrithub.io` hosts `> 48000` projects and the payload size is `=> 14M`.

At a glance, a list of projects will be shown with the `status` of the project.  
In the detailed view, the `description`, `state`, `branches` and `web links` will be shown.

### `Query Changes`

Performs a [query](https://gerrit-review.googlesource.com/Documentation/user-search.html) to search for changes.

If the instance is not authenticated, the initial query will display 50 latest open changes (`status:open -is:wip limit:50"`).  
If the instance is authenticated, the initial query will mimic the personal dashboard and will display all relevant personal changes
(`(owner:self AND is:open) OR (attention:self) OR (reviewer:self AND is:open)`).

Only the current (latest) patchset (revision) of the change is fetched.

At a glance, a list of changes will be shown with the `author`, `updated`, `status`, `unresolved comments`, `mergeable`
(submit requirements), `title` and `number` (with a tooltip showcasing the `project`, `branch`).  
In the detailed view, the `title`, `commit message`, `status`, `project`, `branch`, `updated`, `labels`, `owner`, `author`,
`uploader`, `committer`, `reviewers` and `topic`.

## Potential Improvements

- Get Avatars for users (not all instances use avatars, requires additional API call)
- Add a command preference to modify the unauthenticated query limit
