# Scrycast

Search Magic: The Gathering cards using [Scryfall's](https://scryfall.com) powerful syntax, right from Raycast.

## Commands

### Search Cards
Search the full Scryfall card database. Supports all Scryfall syntax — type a card name or use filters like `t:creature c:red cmc<=3`.

Cards you own are marked with ✅ (exact printing) or ☑️ (different printing) if you've imported your collection.

**Actions on a card:**
- **Enter** — Show card details (image, oracle text, mana cost, type, flavor text)
- **⌘↵** — Open in Scryfall
- **⌘⌃↵** — Open in EDHRec
- **⌘C** — Copy card name
- **⌘⇧C** — Copy card image
- **⌘B** — Bookmark / Remove from Bookmarks
- **⌘T** — Open in Scryfall Tagger
- **⌘⇧T** — Show tags (oracle tags and art tags from Scryfall Tagger)
- **⌘P** — View all prints
- **⌘⇧S** — Select card (for multi-select)

**Multi-select:**
Select multiple cards with **⌘⇧S**, then copy all names or open a combined Scryfall search.

**Sort:** Use the dropdown to sort results by name, EDHRec rank, or price.

### Bookmarked Cards
Browse cards you've bookmarked from Search Cards. All the same actions are available.

### Search My Collection
Import your [ManaBox](https://manabox.app) collection as a CSV and browse or search it within Raycast.

**To import:** In ManaBox, tap ··· → Export → CSV, then select the file in Raycast.

**Browsing:** Shows your 75 most expensive cards by default. Search to find any specific card.

**Actions:**
- **⌘⇧I** — Import a new CSV
- **⌘⇧D** — Clear collection

## Tags

The tags view pulls oracle tags and art tags from [Scryfall Tagger](https://tagger.scryfall.com). Press **Enter** on any tag to search for other cards with that tag inside Raycast, or **⌘↵** to open the search on Scryfall.

## No Setup Required

Scrycast uses the public Scryfall API — no API key or account needed.
