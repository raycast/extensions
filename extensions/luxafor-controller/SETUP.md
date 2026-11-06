# Setup and troubleshooting

## Configure without changing the light

1. Connect your device and start the Luxafor companion app.
2. Select **Webhook** mode and copy the User ID privately.
3. Open Raycast's **Extensions → Luxafor Controller** preferences.
4. Enter **Luxafor User ID** and select **api.luxafor.com**.
5. Open **Control Luxafor**. Its initial history may be unknown; this is expected.

If upgrading, check that the masked User ID preference retained your value. Re-enter the value privately if Raycast asks. Do not include it in screenshots or issue reports.

## Deliberately test a light change

1. Choose **Send Red Test…** from the action panel.
2. Read the confirmation. **Cancel** sends nothing; **Send Red** sends exactly one red command.
3. Inspect the physical device yourself. The previous color is not restored automatically.

A success toast means API acceptance only. To choose a different color afterwards, explicitly send that color.

## Troubleshooting

| What you see                                | What to check                                                                                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API acceptance but no light change          | Check the companion app, Webhook mode, User ID, device power and connection. Acceptance is not physical telemetry.                                                                                                |
| Timeout, network or HTTP error              | Check internet access and configuration. Delivery may already have occurred; inspect the light before resending.                                                                                                  |
| API reported an error                       | Check configuration and Webhook mode. Previous accepted history is retained.                                                                                                                                      |
| Another request in progress                 | Wait for the active request to finish. A suspended command keeps its lock. Close the active command, then refresh history; a terminated process releases its guard without replay. Nothing is queued or replayed. |
| History unavailable                         | Reopen the command. A storage failure before sending blocks the request.                                                                                                                                          |
| History could not be saved after acceptance | Inspect the light before resending. The API request succeeded, but the displayed history may be older.                                                                                                            |
| Menu history is old                         | Choose **Refresh History**. Ensure **Luxafor Menu Bar** is enabled; Raycast's scheduled refresh is approximate.                                                                                                   |
| Existing `.co.uk` setting fails             | Its operation is unverified. Select the documented `.com` endpoint deliberately; the extension never silently switches destinations.                                                                              |

If reporting a problem, include your Raycast version, operating system, device model, action, approximate time and the extension's sanitized error message. Never include your User ID, raw HTTP data or private preference screenshots.

## Custom colors and shortcuts

- Open **Set Custom Color**, enter `#3A7` or `#33AA77`, then choose **Set Custom Color**. Three-digit values expand each digit. A validation error sends nothing.
- Use **Set Busy**, **Set Available** or **Turn off** directly from root search. Assign your own aliases or hotkeys in Raycast's command settings.
- In **Control Luxafor**, select a recent color to resend it deliberately. **Clear Recent Colors** removes the five-item list without changing the light. It does not erase the last accepted command.
- Use **View Request Details** on the history row for the full timestamp and troubleshooting text. **Refresh History** is read-only.
