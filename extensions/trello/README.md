# Trello Extension for Raycast

A Raycast extension to fetch all cards assigned to you and to search cards assigned to you.

You need three values for the extension to work:

- The API token for this application. This should be set, but if you ever need it again, it's "13f8c59607ba6d82531d3db5f46999c1".
- Your Trello username, found in a few places, including the _Profile and visibility_ tab of Trello settings.
- A personal access token to authenticate API calls to Trello. This is slightly complex, but you won't need to do it often.

You should be able to follow this link to login and get the personal access token - GET "https://trello.com/1/authorize?expiration=never&name=RayCastTrelloExtension&scope=read,write&response_type=token&key=13f8c59607ba6d82531d3db5f46999c1"

## Commands

The extension has two commands:

1. _Fetch ToDos_: Fetches all todos assigned to you on Trello.
2. _Search ToDos_: Text search on all todos on all boards you are a member of.

## Future development

This is currently a basic extension and there's a lot more to add, contributions welcome. Ideas include…

- Showing more values from cards in the list view
- Additional search options
- The ability to change values on cards and move them between lists
- Other ideas? Let me know

  ChrisChinchilla on Slack, @ChrisChinch on Twitter, @ChrisChinchilla on GitHub.
