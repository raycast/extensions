# Raycast integration

<br />

The Capacities extension for [Raycast](https://www.raycast.com/) offers quick access to your Capacities data, improving productivity and reducing context switching. It is available on Mac and Windows.

## Setup

1. In Capacities, go to Settings > Raycast and copy the communication token.

2 .Click on 'Install Raycast Extension'. This will open the the [Raycast extension store](https://www.raycast.com/steffenble/capacities).

3. Click 'Install Extension' in the Raycast Store

4. Open Raycast and choose a Capacities command

5. Paste the communication token when prompted.

The integration is now ready to use.

## Commands

Capacities will need to be open in the background to use these commands.

### Search Content

This integration brings you a global search of all your Capacities data.

Run the `Search content` command and enter your search term in the search bar.

This will search full content of all objects in all spaces by default.

Your results will be labeled with their type, and the space they are found in.

Navigate to the result you wish to load, press `enter`, and it'll be opened in Capacities' desktop app.

![Search Results](./media/capacities-1.png)

If you wish to filter the search from Raycast, you can do so with the drop down menu in the top right.

### Open Space

If you use several spaces, you can open any of them via the "Open Space" command.

- Type "Open Space" and press `Enter`
- Type the name of the space you want and press `Enter` to load it

![Open Space](./media/capacities-2.png)

### Save Weblink

Save any weblink to any space with this command.

_For full functionality, you will need to have the correct Raycast permissions loaded first. [See this section](#weblinks-not-working) for more information._

- Open Raycast from any webpage
- Run `Save Weblink`
- This pulls the link into Raycast automatically
- Add any tags or notes to the weblink, and choose which space to send it to
- `Cmd Enter` to create the weblink
- After a couple of seconds, it'll arrive in Capacities as a weblink object

You will see it in the 'Created today' section in your calendar and with your other weblinks.

![Save weblink](./media/capacities-3.png)

### Save to Daily Note

Similar to Weblinks, you can save any text to your daily note.

- Run `Save to Daily Note`
- Enter your note into the text box
- Choose which space to send it to

It will arrive in your daily note with an icon to show it's from Raycast.

![Save to daily note](./media/capacities-5.png)

::: tip Good to know!
You can use markdown, add tags, create content and more, all from Raycast. See more [here](https://docs.capacities.io/reference/integrations/email#how-it-works).
:::

### Create Task

Send [tasks](/reference/task-management) with this command.

- Run `Create Task`
- Enter any relevant information
- Cmd + Enter to save to Capacities

![Add task](./media/capacities-6.png)

## FAQs

**My weblinks are not being prefilled from my browser**

Go to Mac System Settings > Privacy and Security > Automation > Raycast > make sure **system events** is toggled on.

If you don't toggle this on, you will need to paste the link manually.

**Why didn't one of the actions work?**

Capacities must be open in the background in order for the commands to work.
