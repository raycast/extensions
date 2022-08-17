# Bibmanager

Extension for quickly accessing your [bibmanager](https://bibmanager.readthedocs.io/en/latest/) database from Raycast. Search the database (by bibkey, author, title, year or tags) and quickly access entries by opening or downloading the pdf.
You can also open or copy the ADS link and copy the bibtex entry. Make sure to explore available actions in the action panel (⌘ + K).

## How to setup the Location of the python bin

In order for Raycast to find bibmanager, you need to provide the location of the python binary that is used to execute bibmanager. 

1. Open the terminal
2. Check that you are able to use bibmanager: `bibm -v`
3. run `which python` 
4. Select the path and copy it
5. Paste the path into the preference field for the python bin

## Searching

This extension uses a fuzzy search that searches in bibkey, title, year, authors (any) and tags.

- seperate searchstrings with a whitespace (e.g., to search 2022 in years and `Einstein` in authors, just do `Einstein 2022`)
- Use a `+` to extend a searchstring (e.g., to search `How+drifting` in the title)
- Use a `.` for tags (e.g., `.software` searches for the software tag)

Note: If this instruction wasn't clear, please let me know in [Slack Community](https://raycast.com/community) or feel free to create a PR with improved steps.
