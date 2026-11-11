# SpecStream

SpecStream is the live web data engine for teams and agents. One platform to build, search, extract, enrich, map, and monitor data across the entire web.

In Raycast, you describe the data you need in plain words, approve the most it can cost, and the results open as a list. For example:

- Rust command-line tools on GitHub with more than 1,000 stars, pushed to in the last month, under an MIT or Apache license.
- Texas food banks with their revenue.
- Companies that filed to raise $5M or more this week.

## How a request works

1. Run **Request Data** and describe the data you need.
2. Choose **Check My Request**. SpecStream shows how it read your request and the most the run can cost. Nothing is spent yet.
3. Type that maximum to approve it, then choose **Approve and Run**.
4. The results open in Raycast. On a result, choose **Copy Result**, or **Open Source** to open the page its value came from. Choose **Open in SpecStream** to open the run in your workspace.

## Pricing

Each result delivered is charged at its rate on the [pricing page](https://specstream.ai/pricing), and never more than the maximum you approved. If fewer results match than the minimum shown with the price, nothing is charged. New accounts start with $10 of work on sign-up, no card.

## Set up

1. Create an account at [specstream.ai](https://specstream.ai/workspace).
2. In the workspace, open **Agents & API** and create an API key. Give it only the projects and spending limit you want Raycast to use.
3. Paste the key into the **API Key** preference in Raycast.

The key's permissions and spending limit apply in Raycast too. If your balance is too low to cover the maximum, choose **Review in SpecStream or Add Balance** from the action panel.

Leave **API Origin** at its default unless SpecStream support asks you to change it.

## More

- [Pricing](https://specstream.ai/pricing)
- [REST API](https://specstream.ai/docs/api)
