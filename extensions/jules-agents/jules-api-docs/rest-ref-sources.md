REST Resource: sources

bookmark_border
Resource: Source
An input source of data for a session.

JSON representation

{
"name": string,
"id": string,

// Union field source can be only one of the following:
"githubRepo": {
object (GitHubRepo)
}
// End of list of possible types for union field source.
}
Fields
name
string

Identifier. The full resource name (e.g., "sources/{source}").

id
string

Output only. The id of the source. This is the same as the "{source}" part of the resource name (e.g., "sources/{source}").

Union field source. The input data source. source can be only one of the following:
githubRepo
object (GitHubRepo)

A GitHub repo.

GitHubRepo
A GitHub repo.

JSON representation

{
"owner": string,
"repo": string,
"isPrivate": boolean,
"defaultBranch": {
object (GitHubBranch)
},
"branches": [
{
object (GitHubBranch)
}
]
}
Fields
owner
string

The owner of the repo; the <owner> in https://github.com/<owner>/<repo>.

repo
string

The name of the repo; the <repo> in https://github.com/<owner>/<repo>.

isPrivate
boolean

Whether this repo is private.

defaultBranch
object (GitHubBranch)

The default branch for this repo.

branches[]
object (GitHubBranch)

The list of active branches for this repo.

GitHubBranch
A GitHub branch.

JSON representation

{
"displayName": string
}
Fields
displayName
string

The name of the GitHub branch.

Methods
get
Gets a single source.
list
Lists sources.

Method: sources.get

bookmark_border
Gets a single source.

HTTP request
GET https://jules.googleapis.com/v1alpha/{name=sources/**}

The URL uses gRPC Transcoding syntax.

Path parameters
Parameters
name
string

Required. The resource name of the source to retrieve. Format: sources/{source} It takes the form sources/{+source}.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Source.

Method: sources.list

bookmark_border
Lists sources.

HTTP request
GET https://jules.googleapis.com/v1alpha/sources

The URL uses gRPC Transcoding syntax.

Query parameters
Parameters
filter
string

Optional. The filter expression for listing sources, based on AIP-160. If not set, all sources will be returned. Currently only supports filtering by name, which can be used to filter by a single source or multiple sources separated by OR.

Example filters: - 'name=sources/source1 OR name=sources/source2'

pageSize
integer

Optional. The number of sources to return. Must be between 1 and 100, inclusive. If unset, defaults to 30. If set to greater than 100, it will be coerced to 100.

pageToken
string

Optional. A page token, received from a previous sources.list call.

Request body
The request body must be empty.

Response body
Response message for the sources.list RPC.

If successful, the response body contains data with the following structure:

JSON representation

{
"sources": [
{
object (Source)
}
],
"nextPageToken": string
}
Fields
sources[]
object (Source)

The sources from the specified request.

nextPageToken
string

A token, which can be sent as pageToken to retrieve the next page. If this field is omitted, there are no subsequent pages.
