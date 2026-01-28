# Fathom Analytics Stats
A Raycast extension to browse your website analytics coming from Fathom.

![Fathom Analytics Stats extension - Commands](https://github.com/yannglt/raycast-extensions/assets/16894359/b26ebcdd-44e0-401e-96d4-5ea4b486e209)


| Commands                    | Description                                                         |
| :---                        | :---                                                                |
| `Current Visitors`          | Display your current pageviews and referrers in your menu bar       |
| `Current Visitors Menu Bar` | Display your current pageviews and referrers the command's subtitle |
| `Browse Pageviews`          | Display your most viewed pages                                      |
| `Browse Referrers`          | Display your referrers                                              |
| `Browse Browsers`           | Display your visitor browsers                                       |
| `Browse Countries`          | Display your visitor countries                                      |
| `Browse Devices`            | Display your visitor devices (desktop, tablet, mobile)              |
| `Open Dashboard`            | Open your Fathom dashboard                                          |
| `Open Site Settings`        | Open your Fathom site settings                                      |

Each aggregation of page views is sorted in descending order, with a relative percentage to the total.

Each command comes with a time range option, which can be set to: `Today`, `Yesterday`, `Last 7 Days`, `Last 30 Days`, `This Month`, `Last Month`, `This Year`, `Last Year`, `All Time`.

Note that `Current Visitors` and `Current Visitors Menu Bar` are refreshed every minute.

## Installation
1. Clone the repository.
2. Install dependencies with `npm install`.
3. Build the extension with `npm run build`.
4. Open the extension with Raycast.

## Setup
1. Sign in to your Fathom account.
2. Obtain an API token [here](https://app.usefathom.com/api) and site ID from Fathom your site settings.
3. Add the API token and site ID to the extension preferences in Raycast. If you have selected a site-specific API token, make sure you choose the correct site you want to view in the extension.

## Usage
1. Open Raycast.
2. Type `fathom` to see the list of available commands.
3. Select a command and press `Enter` to execute it.

## Troubleshooting
For now, Fathom's API is rate limited to 10 requests per minute on aggregations — for the commands, and currents — for the menu bar. If you exceed this limit, you will an error. If you receive this error, please wait a minute before trying again.

Also, the `aggregation` API endpoint is only accurate on data from March 2021. Learn more about it [here](https://usefathom.com/api#aggregation).

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
