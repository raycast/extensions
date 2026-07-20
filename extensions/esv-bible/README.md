# ESV-Bible

Look up and search the ESV Bible using the ESV API. Copy, paste, or browse passages and search results directly from Raycast.

## Commands

### Lookup Passage

Type one or more Bible references (e.g., "John 3:16", "Genesis 1:1-3") to retrieve the full passage text. Results are displayed with your chosen styling and cached for quick access.

**Actions:**
- Copy Styled Text
- Paste Styled Text
- Copy Plain Text
- Paste Plain Text
- Copy Reference
- Clear Previous Passages

### Search Bible

Search for a word or phrase across the entire ESV (e.g., "Jesus sea of Galilee"). Results show matching references with surrounding context.

**Actions:**
- Open at ESV.org
- Copy Search Results
- Paste Search Results
- Clear Previous Searches

## Installation

In order to call the API, you need both a free account with esv.org and permission granted to use the API with your application.

1. Go to api.esv.org, click the avatar, and choose Sign In (you can create an account if needed).
2. Click **Create an API Application** to request permission to use the API.
3. Provide details for your application. Depending on your needs, your application may require staff approval.
4. Once your application is approved, esv.org will provide you an API key. (Note: treat your API key like a password.)
5. If you need access to your API key in the future, you can find it by logging in, clicking the avatar, and choosing **My API Applications**. All your approved applications should show in the list.

## Preferences

### Extension Preferences

| Preference | Description | Default |
|---|---|---|
| ESV API Token | Your API key from api.esv.org | Required |
| Search Mode | **Live Search** fires API calls as you type (debounced). **Search on Enter** waits until you press Enter. | Live Search |
| Include passage references | Show the passage reference before the text | On |
| Include verse numbers | Show verse numbers in the passage | On |
| Include first verse number | Show the verse number for the first verse of a chapter | On |
| Include Selahs | Show "Selah" in certain Psalms | On |
| Include footnotes | Show callouts to footnotes | On |
| Include headings | Show section headings (e.g., "The Sermon on the Mount") | On |
| Indent paragraphs | Indent paragraphs with two spaces | On |
| Indent poetry | Indent poetry lines | On |
| Include copyright | Full, short, or no copyright notice | Short |
| Tabs or Spaces | Indent with spaces or tabs | Spaces |

### Command Preferences

Each command has its own **Default Action** preference that controls which action triggers when you press Enter.

- **Lookup Passage:** Copy Styled Text (default), Paste Styled Text, Copy Plain Text, Paste Plain Text, or Copy Reference
- **Search Bible:** Open at ESV.org (default), Copy Search Results, or Paste Search Results

During each Lookup Passage query, you can also choose between predefined styling options via the dropdown.

## Copyright Notice and Usage

> Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language.

> Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible. View full terms of use at https://api.esv.org/.