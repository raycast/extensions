# Messages

A great companion for Raycast users using the Messages app. 

This extension allows you to:

- Send a message to one of your contacts
- Browse through your messages
- Quickly reply to someone and generate replies using AI
- Open your recents chats in the Messages app
- Check on your unread messages in the menu bar
- And much more!

## AI Extension

The AI will use your latest messages to match your writing style. But you can improve its accuracy by adding custom instructions in your preferences. Here are a few ideas:

- Names/Nicknames: How you refer to people.
- Emoji Style: What emojis you like and how you use them.
- Expressions: Common phrases you use.
- Tone: How formal or casual you are.
- Abbreviations: Any shorthand you prefer (e.g., "rn", "tbh").
- Punctuation & Capitalization: Your style for both.
- Language Varieties: US/UK English or slang.
- Message Length: More detail or more concise.

## Known limitations

Apple provides limited options for interacting with the Messages app. There is only a basic AppleScript API for sending messages, which seems unmaintained, and no official API for reading messages. To access your messages, this extension reads them directly from the `~/Library/Messages/chat.db` file. Due to these limitations, certain features cannot be implemented, as detailed below.

> [!IMPORTANT]
> Have you found a solution to any of these limitations or discovered workarounds? Please consider contributing to improve this extension for everyone.

### No messages are displayed

As mentioned earlier, the file located at `~/Library/Messages/chat.db` is accessed to display your messages. However, the file might be corrupted, empty, or not properly updated by Apple. You can try logging out of iCloud and logging back in, but this may not necessarily resolve the issue.

### Can't search for older messages

Apple stores the actual message content in a proprietary format that we decode in TypeScript after getting your messages from the DB file. This implies that searching for a message can't be done at the SQL level. For performance reasons, only the latest 1000 messages are retrieved when searching for messages.

### My messages are not marked as read

Apple doesn't provide any API to mark messages as read. The only way to mark a message as read is to open the Messages app and mark it as read there. This is painful, but there are no other options as of now.

### Opening a chat doesn't highlight it in the sidebar of the Messages app

A simple URL using the SMS protocol (e.g., `sms://open?addresses=1234567890`) opens a chat in the Messages app. However, this URL doesn't highlight the chat in the sidebar if you need to scroll to find it. Unfortunately, this is not something we can fix.

### Can't send messages to group chats

This is a weird one. If your group chat has a name, you can send messages from Raycast without any issues because it's [supported in the AppleScript API](https://stackoverflow.com/questions/15958090/send-group-imessage-using-applescript/69037299#69037299). However, if the group chat is unnamed, it's not possible to send a message somehow with all of the phone numbers, the chat ID, or anything else. Why is this like this? Honestly, I don't know. To resolve this, simply give your group chat a name.

### Some of my group chats are not showing up

Another weird one. Group chats with a name can't be opened from Raycast. Why? Because the `sms://` URL scheme doesn't support opening them by name or ID. While it's technically possible to open them with all the participants' phone numbers, this would create a new group chat besides the existing one that actually has a name. 

Let's take an example, you have a group chat named "Best Friends" with two of your friends:

- Alice (1234567890)
- Bob (9876543210)

If you try to open the chat from Raycast, it'll actually open the following URL: `sms://open?addresses=1234567890,9876543210` which will cause the creation of a new group chat without a name (Alice and Bob). You wouldn't want to bother your friends or family with a new group chat, would you? 😄

### Can you add support for deleting messages/pinning chats/other features?

Same answer as above, Apple doesn't provide any API for these actions. It'd be awesome to have them, but we're quite limited with only a `.db` file to work with.

### Can't send messages

If you try to send a message from Raycast, and receive this error: "execution error: Not authorized to send Apple events to System Events" then you need to enable automation permissions for Raycast in your system settings. Particularily, you need to enable "System Events" in the "Privacy & Security" section for Raycast.