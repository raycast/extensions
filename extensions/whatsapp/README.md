# WhatsApp Extension

## How to get WhatsApp group code

1. Open the WhatsApp group in any platform
2. Click on the chat header to see the group information
3. Scroll down and click `Invite to Group via Link`
4. You will see a URL that looks like `https://chat.whatsapp.com/<group_code>`
5. Copy the group code from the URL and paste it in Raycast

## Developer details

At the time of writing this, WhatsApp does not offer a public API for users. It only provides application links to
quickly access already existing chats. Until WhatsApp provides a public API, the `Add Chat` and `Add Existing Group`
commands will serve for adding the chats to the extension so users can access them from the `Open Chat` command.

When the API is available, the `Add Chat`, `Import Contacts` and `Add Existing Group` commands will be obsolete while
new commands such as `Create Group` or `Send Message` will become feasible.
