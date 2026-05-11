# Opsgenie Changelog

## [Add Action to `Unacknowledge Alert`] - 2024-09-10

### Enhancements
- Alerts can now be Unacknowledged
- EmptyViews are shown based on your query
- Toasts are shown before, during and after actions
- Opsgenie batches some requests so e.g. after closing an alert, the alert may still be shown as "open" until you reload/retype the Raycast query; now the updated result is shown locally so you can reasonably know what the current status is without having to refresh (though fetching lastest data is always recommended)

### Dev
- Remove Preferences type
- Imrpove Error handling and data fetching by declaring their types
- utilize `useFetch for GET requests
- utilize **mutate** of `useFetch` for POST requests

## [Improve Search Handling] - 2022-08-28

- Alerts and incidents can now be searched via the [Opsgenie query syntax](https://support.atlassian.com/opsgenie/docs/search-queries-for-alerts/)
- The saved searches command was removed, instead a default query for alerts and incidents can be set in the settings

## [Add Command for Saved Searches] - 2021-10-25

- Add command to view saved searches

## [Add Opsgenie Extension] - 2021-10-19

- Add initial version of the Opsgenie extension
