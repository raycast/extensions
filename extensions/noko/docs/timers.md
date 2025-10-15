# Timers

When you start a timer on a project, it will appear in the list of active timers.
You can pause or stop the timer, and when you stop it, a log entry will be created with the time tracked.

## Documentation

https://developer.nokotime.com/v2/timers

## Example Request

```http
curl -H "X-NokoToken:scbp72wdc528hm8n52fowkma321tn58-jc1l2dkil0pnb75xjni48ad2wwsgr1d" https://api.nokotime.com/v2/timers
```

```http
[
  {
    "id":5750932,
    "state":"running",
    "date":"2015-01-01",
    "seconds":176356636,
    "formatted_time":"03:57:16",
    "description":"Test description with #hashtags",
    "user":{
        "id":5543,
        "email":"apitest@letsfreckle.com",
        "first_name":"test",
        "last_name":"user",
        "profile_image_url":"https://cdn.nokotime.com/images/user_icons/default-tu-72x722x.png",
        "url":"https://api.nokotime.com/v2/users/5543"
    },
    "project":{
        "id":34573,
        "name":"Activity_2_omnisnumquamreiciendis",
        "billing_increment":15,
        "enabled":true,
        "billable":true,
        "color":"#ef9655",
        "url":"https://api.nokotime.com/v2/projects/34573"
    },
    "url":"https://api.nokotime.com/v2/projects/34573/timer",
    "start_url":"https://api.nokotime.com/v2/projects/34573/timer/start",
    "pause_url":"https://api.nokotime.com/v2/projects/34573/timer/pause",
    "add_or_subtract_time_url":"https://api.nokotime.com/v2/projects/34573/timer/add_or_subtract_time",
    "log_url":"https://api.nokotime.com/v2/projects/34573/timer/log",
    "log_inbox_entry_url":"https://api.nokotime.com/v2/projects/34573/timer/log_inbox_entry"
  }
]
```
