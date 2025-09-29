# Simple Snippet - Raycast Extension

Store multiple text snippets easily, cut/copy them quickly..

Toggle between them quickly.

Originally created because with most AI chat interfaces submission is often the "Enter" key... So when you do a new line, if you forget to press "shift" then it submits the chat.

However, it could be used as a general purpose text snippet store, for instance, for messaging, text editing, as a swap space for the clipboard .etc...

## Command

- Simplesnippet

### Actions

#### Text

- Cut/Copy (default action when text is selected): `Cmd + Enter`
- Copy (when cut is default): `Ctrl + C`
- Cut (when copy is default): `Ctrl + X`
- Copy (keep open): `Ctrl + [`
- Duplicate: `Ctrl + ]`
- Clear text: `Ctrl + Backspace`

#### Storage

- Add (only if text isn't blank): `Ctrl + =`
- Delete: `Ctrl + -`


#### Navigation

- Next (switches if there is a next snippet, or creates a new one if there isn't): `Ctrl + .`
- Previous (switches if there is text, discards if it is blank): `Ctrl + ,`

#### Settings

- Set Copy/Cut As Default
- Reset (resets everything: the settings and discards all snippets)