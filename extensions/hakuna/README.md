# Hakuna Timer

Hakuna Extention to start and stop a timer at hakuna.ch

## Get your personal API Token

First, get your API token from https://app.hakuna.ch/token.

## Get your Project-ID and Task-ID
Start a timer manually via the web interface, as you have always done before.

We then read out the project ID and the task ID using the following command. Replace `your-token` with your own API token.

```
curl -X "GET" "https://app.hakuna.ch/api/v1/timer" \
 -H "Accept-Version: v1" \
 -H "X-Auth-Token: your-token"
```

In the following response you can find your Project-ID and Task-ID, example:

```
{"date":"2024-09-24","start_time":"07:59","duration":"4:04","duration_in_seconds":14640.0,"note":null,"user":{"id":10,"name":"Firstname Lastname","email":"user@domain.tld","status":"active","groups":["Group ABC"],"teams":["Team ABC"]},"task":{"id":2,"name":"Arbeit","archived":false,"default":true},"project":1}%
```

We are looking for the section `task` and there for `id` and `project`. In this example Task-ID = `2` and Project-ID = `1`.
If you are not using projects, the response should be `"project":"null"` you can then leave the Project-ID empty.
