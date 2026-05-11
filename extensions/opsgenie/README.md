# Opsgenie

The Opsgenie extension can be used to access alerts and incidents from [Opsgenie](https://www.atlassian.com/software/opsgenie). The extension can also used to acknowledge, unacknowledge, snooze and close alerts.

## 🚀 Getting Started
You will need the following:

1. API URL of Opsgenie instance - this will depend on where your instance is based, either https://api.opsgenie.com or https://api.eu.opsgenie.com
2. API Key - for best results, you will need an "Integration" API Key:
    - `Navigate` to your Opsgenie instance
    - `Navigate` to **Teams**
    - `Open` the Team
    - `Open` **Integrations**
    - `Click` **Add integration**
    - `Select` "API"
    - `Generate` the key
    - (The options may vary so refer to https://support.atlassian.com/opsgenie/docs/create-a-default-api-integration/)
3. Opsgenie Username - this is the username you want to use for alerts/incidents
4. Opsgenie URL - this is your Opsgenie instance URL

## ❔ FAQs

<details>
<summary>Q1. I snoozed an alert but it's still showing as active?</summary>
Ans,. Ensure that you have entered the correct user in Preferences and that you have the capability to snooze as Opsgenie does not seem to know if the user is invalid.
</details>
<details>
<summary>Q2. I did x and query is for NOT x - why does the item still show? e.g. "I closed an alert and the query is 'status: open'"</summary>
Ans,. This is the same behavior as the web app.
</details>
