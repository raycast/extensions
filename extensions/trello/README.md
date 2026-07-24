# Trello Extension for Raycast

A Raycast extension to view and manage Trello boards, lists, and cards.

## Auth

Populate the extension preferences (Raycast → Extensions → Trello → Settings):

- `API Token` (aka Trello key)
- `Personal Access Token` (generated from Trello with read,write scopes)
- `Trello Username` (used for legacy commands)
- Optional: include closed boards toggle

The auth URL to generate a token (replace the key if you use your own app):

```
https://trello.com/1/authorize?expiration=never&name=RayCastTrelloExtension&scope=read,write&response_type=token&key=13f8c59607ba6d82531d3db5f46999c1
```

## Commands

- Fetch Cards: cards assigned to you (all boards)
- Search Cards: search cards across all boards
- Search Boards: browse and open your boards
- Fetch Board: view a board’s lists and members
- Fetch Cards: pick a board and list to view its cards
- Create a Card: create a card on a selected board/list
- Move Card: move a card to another list on the same board
- Delete Card: select a list, then a card, and delete it

## Notes

- Uses Trello REST API with read/write scopes
- Shows links for browser and Trello desktop
- Attachments and checklists are displayed in the card detail view
