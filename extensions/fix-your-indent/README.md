# Fix Your Indent

Removes unnecessary leading whitespaces from text when you want to paste code into your web browser.

Imagine you are working on some deeply nested code that looks like this:

```ts
                <Action
                  title="Copy Email"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: [], key: "enter" }}
                  onAction={async () => {
                    await Clipboard.copy(account.email);
                    await Clipboard.paste(account.email);
                    await showHUD("Copied Email to Clipboard 📋");
                  }}
                />
```

When you copy-paste it into a browser, say GitHub or StackOverflow, it might look  something like this:

![Some deeply nested code](./media/fix-your-indent-1.png)

And you have to go line by line, removing the unnecessary leading whitespaces.

If you use run `Remove Unnecessary Leading Whitespaces` command:

![Raycast screenshot of running the command](./media/fix-your-indent-2.png)

It will take the text from your clipboard, remove the unnecessary leading whitespaces, and paste it back to your clipboard, so your code snippet can look something like this:

![Code with proper formatting](./media/fix-your-indent-3.png)