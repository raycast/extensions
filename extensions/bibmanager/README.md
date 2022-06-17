# Bibmanager

Extension for quickly accessing your bibmanager database from Raycast. Search the database (by bibkey, author, title or year) and open or download the pdf or open the ADS link for your bibmanager entries.
Make sure to explore available actions in the action panel (⌘ + K).

## How to setup the Location of the python bin

In order for Raycast to find bibmanager, you need to provide the location of the python binary that is used to execute bibmanager. 

1. Open the terminal
2. Check that you are able to use bibmanager: `bibm -v`
3. run `which bibm` 
4. Select the path and copy it
5. Paste the path into the preference field for the python bin

_Note: If this instruction wasn't clear, please let me know in [Slack Community](https://raycast.com/community) or feel free to create a PR with improved steps.