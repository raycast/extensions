# Bugzilla

## Caveats

- [Bugzilla](https://bugzilla.org) being a robust open-source software,
  many organizations and users customize their instances.
  Not all instances may behave the same.
- Assumes all Bugzilla instances expose the `/rest/` endpoint
  (behind the scenes, the server rewrites requests
  to `/rest.cgi/`.
- **Be careful!** API Key is passed as part of the URL request [capability URLs](https://w3ctag.github.io/capability-urls/).
  Some instances may offer additional custom authentication, which is not
  generic and is not supported by this extension.
  For example, [Red Hat Bugzilla](https://bugzilla.redhat.com) allows an
  `Authorization` header.
  The alternative is to use a generated Token (login session) intended to be
  deprecated in future Bugzilla releases.
- The default queries in this extension might not work on all instances.
  Please report any issues you encounter.
- Older instances may not return the `description` field.
- Default query limit is set to `100`, which can be changed in the extension preference.

## About

Interact with Bugzilla instances to view bugs.

This extension leverages the REST API (XMLRPC and JSONRPC are not supported)
endpoints which may not be available on old instances.
Bugzilla version(s) `>= 5.0` are supported.

Multiple Bugzilla instances are supported.

Supports providing a custom single header for authorization purposes, for example,
`Bugzilla_api_key: ${apiKey}`
(`${apiKey}` will be interpolated to the provided API key).

In the current scope of the extension, no plans to support any operations that modify
bugs in Bugzilla.  
The extension aims to provide information at a glance, especially if working with
multiple instances.  
Users should keep using the web interface to modify Bugzilla bugs.

## Commands

### `Open Bugs Reported By Me`

REST API Query: `<BUGZILLA_INSTANCE>/rest/bug?creator=<LOGIN>&is_open=true&resolution=---&limit=<EXTENSION_PREFERENCE_LIMIT>`

Query open bugs reported by the logged-in user.

### `Open Bugs Assigned To Me`

REST API Query: `<BUGZILLA_INSTANCE>/rest/bug?assigned_to=<LOGIN>&is_open=true&resolution=---&limit=<EXTENSION_PREFERENCE_LIMIT>`

Query bugs assigned to the logged-in user.

### `My CC Bugs`

REST API Query: `<BUGZILLA_INSTANCE>/rest/bug?cc=<LOGIN>&is_open=true&resolution=---&limit=<EXTENSION_PREFERENCE_LIMIT>`

Query bugs CCed by the logged-in user.

### `Quick Search`

REST API Query: `<BUGZILLA_INSTANCE>/rest/quicksearch?<COMAMND_QUERY>`

Performs a [Quicksearch](https://www.bugzilla.org/docs/4.4/en/html/query.html#:~:text=Quicksearch,search%20only%20in%20that%20product.)
using input provided by the command.

## Potential Improvements

- Expose an ability to run custom searches.
- Allow to sort bugs based on severity, modified date, bug IDs, etc.
