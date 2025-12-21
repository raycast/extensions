Service: jules.googleapis.com
To call this service, we recommend that you use the Google-provided client libraries. If your application needs to use your own libraries to call this service, use the following information when you make the API requests.

Service endpoint
A service endpoint is a base URL that specifies the network address of an API service. One service might have multiple service endpoints. This service has the following service endpoint and all URIs below are relative to this service endpoint:

https://jules.googleapis.com
REST Resource: v1alpha.sessions
Methods
approvePlan POST /v1alpha/{session=sessions/_}:approvePlan
Approves a plan in a session.
create POST /v1alpha/sessions
Creates a new session.
get GET /v1alpha/{name=sessions/_}
Gets a single session.
list GET /v1alpha/sessions
Lists all sessions.
sendMessage POST /v1alpha/{session=sessions/_}:sendMessage
Sends a message from the user to a session.
REST Resource: v1alpha.sessions.activities
Methods
get GET /v1alpha/{name=sessions/_/activities/_}
Gets a single activity.
list GET /v1alpha/{parent=sessions/_}/activities
Lists activities for a session.
REST Resource: v1alpha.sources
Methods
get GET /v1alpha/{name=sources/\*\*}
Gets a single source.
list GET /v1alpha/sources
Lists sources.

REST Resource: sessions

bookmark_border
Resource: Session
A session is a contiguous amount of work within the same context.

JSON representation

{
"name": string,
"id": string,
"prompt": string,
"sourceContext": {
object (SourceContext)
},
"title": string,
"requirePlanApproval": boolean,
"automationMode": enum (AutomationMode),
"createTime": string,
"updateTime": string,
"state": enum (State),
"url": string,
"outputs": [
{
object (SessionOutput)
}
]
}
Fields
name
string

Output only. Identifier. The full resource name (e.g., "sessions/{session}").

id
string

Output only. The id of the session. This is the same as the "{session}" part of the resource name (e.g., "sessions/{session}").

prompt
string

Required. The prompt to start the session with.

sourceContext
object (SourceContext)

Required. The source to use in this session, with additional context.

title
string

Optional. If not provided, the system will generate one.

requirePlanApproval
boolean

Optional. Input only. If true, plans the agent generates will require explicit plan approval before the agent starts working. If not set, plans will be auto-approved.

automationMode
enum (AutomationMode)

Optional. Input only. The automation mode of the session. If not set, the default automation mode will be used.

createTime
string (Timestamp format)

Output only. The time the session was created.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: "2014-10-02T15:01:23Z", "2014-10-02T15:01:23.045123456Z" or "2014-10-02T15:01:23+05:30".

updateTime
string (Timestamp format)

Output only. The time the session was last updated.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: "2014-10-02T15:01:23Z", "2014-10-02T15:01:23.045123456Z" or "2014-10-02T15:01:23+05:30".

state
enum (State)

Output only. The state of the session.

url
string

Output only. The URL of the session to view the session in the Jules web app.

outputs[]
object (SessionOutput)

Output only. The outputs of the session, if any.

SourceContext
Context for how to use a source in a session.

JSON representation

{
"source": string,

// Union field context can be only one of the following:
"githubRepoContext": {
object (GitHubRepoContext)
}
// End of list of possible types for union field context.
}
Fields
source
string

Required. The name of the source this context is for. To get the list of sources, use the ListSources API. Format: sources/{source}

Union field context. The context for how to use the source in a session. context can be only one of the following:
githubRepoContext
object (GitHubRepoContext)

Context to use a GitHubRepo in a session.

GitHubRepoContext
Context to use a GitHubRepo in a session.

JSON representation

{
"startingBranch": string
}
Fields
startingBranch
string

Required. The name of the branch to start the session from.

AutomationMode
The automation mode of the session.

Enums
AUTOMATION_MODE_UNSPECIFIED The automation mode is unspecified. Default to no automation.
AUTO_CREATE_PR Whenever a final code patch is generated in the session, automatically create a branch and a pull request for it, if applicable.
State
State of a session.

Enums
STATE_UNSPECIFIED The state is unspecified.
QUEUED The session is queued.
PLANNING The agent is planning.
AWAITING_PLAN_APPROVAL The agent is waiting for plan approval.
AWAITING_USER_FEEDBACK The agent is waiting for user feedback.
IN_PROGRESS The session is in progress.
PAUSED The session is paused.
FAILED The session has failed.
COMPLETED The session has completed.
SessionOutput
An output of a session.

JSON representation

{

// Union field output can be only one of the following:
"pullRequest": {
object (PullRequest)
}
// End of list of possible types for union field output.
}
Fields
Union field output. An output of the session. output can be only one of the following:
pullRequest
object (PullRequest)

A pull request created by the session, if applicable.

PullRequest
A pull request.

JSON representation

{
"url": string,
"title": string,
"description": string
}
Fields
url
string

The URL of the pull request.

title
string

The title of the pull request.

description
string

The description of the pull request.

Methods
approvePlan
Approves a plan in a session.
create
Creates a new session.
get
Gets a single session.
list
Lists all sessions.
sendMessage
Sends a message from the user to a session.

Method: sessions.approvePlan

bookmark_border
Approves a plan in a session.

HTTP request
POST https://jules.googleapis.com/v1alpha/{session=sessions/*}:approvePlan

The URL uses gRPC Transcoding syntax.

Path parameters
Parameters
session
string

Required. The resource name of the session to approve the plan in. Format: sessions/{session} It takes the form sessions/{session}.

Request body
The request body must be empty.

Response body
If successful, the response body is empty.

Method: sessions.create

bookmark_border
Creates a new session.

HTTP request
POST https://jules.googleapis.com/v1alpha/sessions

The URL uses gRPC Transcoding syntax.

Request body
The request body contains an instance of Session.

Response body
If successful, the response body contains a newly created instance of Session.

Method: sessions.get

bookmark_border
Gets a single session.

HTTP request
GET https://jules.googleapis.com/v1alpha/{name=sessions/*}

The URL uses gRPC Transcoding syntax.

Path parameters
Parameters
name
string

Required. The resource name of the session to retrieve. Format: sessions/{session} It takes the form sessions/{session}.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Session.

Method: sessions.list

bookmark_border
Lists all sessions.

HTTP request
GET https://jules.googleapis.com/v1alpha/sessions

The URL uses gRPC Transcoding syntax.

Query parameters
Parameters
pageSize
integer

Optional. The number of sessions to return. Must be between 1 and 100, inclusive. If unset, defaults to 30. If set to greater than 100, it will be coerced to 100.

pageToken
string

Optional. A page token, received from a previous sessions.list call.

Request body
The request body must be empty.

Response body
Response message for sessions.list.

If successful, the response body contains data with the following structure:

JSON representation

{
"sessions": [
{
object (Session)
}
],
"nextPageToken": string
}
Fields
sessions[]
object (Session)

The sessions from the specified request.

nextPageToken
string

A token, which can be sent as pageToken to retrieve the next page. If this field is omitted, there are no subsequent pages.

Method: sessions.sendMessage

bookmark_border
Sends a message from the user to a session.

HTTP request
POST https://jules.googleapis.com/v1alpha/{session=sessions/*}:sendMessage

The URL uses gRPC Transcoding syntax.

Path parameters
Parameters
session
string

Required. The resource name of the session to post the message to. Format: sessions/{session} It takes the form sessions/{session}.

Request body
The request body contains data with the following structure:

JSON representation

{
"prompt": string
}
Fields
prompt
string

Required. The user prompt to send to the session.

Response body
If successful, the response body is empty.
