# Examples

This is an extension with multiple commands to showcase the Raycast API. 

## Getting started

To use the extension follow these steps:
1. Checkout the repository
2. Open the `Import Extension` command in Raycast and select the `examples` folder of this repository
3. Continue to the `Manage Extensions` command in Raycast
4. Select the imported Examples extension, press `⌘` `K` to open the Action Panel and select `Open With...` to open the extension in your text editor of choice
5. Run `npm install && npm run dev` from the extensions folder in your Terminal
6. Have fun exploring the code of the examples 🎉

After you executed `npm run dev`, changes to the extension are picked up automatically by Raycast. You can explore and change the code of the examples and test it directly in Raycast. For example, change the link in the `<OpenInBrowserAction>` in [`actions.tsx`](src/actions.tsx), save the file and observe that the new link is now opened when the action is performed via Raycast.
