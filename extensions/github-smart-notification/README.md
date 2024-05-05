# Github Smart Notification

Ley you know the necessary notifactions only

## Feature 1 - Auto read notification based on Configuration

GitHub notification has a specific property.

- reason : Why the notification is published
- repository.full_name : The repository the notification originates from
- title : Notification title

detail is [here](https://docs.github.com/en/rest/activity/notifications?apiVersion=2022-11-28)

Based on the configuratioin, this extension will read it automatically

## Feature 2 - Auto read merged PR notification

Github notification data has a property of subject.type
if subject.type is PullRequest and its state has been closed, this extension will read it automatically