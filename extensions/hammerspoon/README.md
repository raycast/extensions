# Hammerspoon

Control 🔨 Hammerspoon directly from Raycast.

✅ Requirements

- Requires the installation of Hammerspoon. Go to https://www.hammerspoon.org/ to download.
- With Hammerspoon installed, open your configuration file. By default Hammerspoon configuration file is located at `~/.hammerspoon/init.lua`. If you don't have this file, you can create it by running `touch ~/.hammerspoon/init.lua` in your terminal.
- Add this line at the top of your configuration file: `hs.allowAppleScript(true)`, save the file and reload Hammerspoon.
- All set! You can now control Hammerspoon from Raycast.

## List Scripts setup

The `List Scripts` command allows you to list and run custom Hammerspoon scripts directly from Raycast.

To set it up, you first need to define a lua global variable in your Hammerspoon configuration file, this variable should be a table that contains two functions, `list` and `execute`. These two functions are going to be called by this raycast extension when listing and running scripts:

- The `list` function should return a json array describing your scripts. each item in the array can have the following properties:
  - `id`: a unique identifier for the script (must be unique, it is used to run scripts) **(required)**.
  - `name`: the name of the script to be displayed in Raycast **(required)**.
  - `description`: a short description of the script to be displayed in Raycast.
  - `keywords`: an array of keywords to help with searching for the script in Raycast.
- The `execute` function expects to receive a script id as an argument, and execute the corresponding script.

Finally, you need to put the name of the global variable you created in your Hammerspoon configuration file in the `List Scripts` command preferences.

Example of a Hammerspoon configuration file with the `List Scripts` setup:

```lua
-- <<rest of your configuration file>>

local scriptDefs = {
  { id = 'test', name = 'Test', description = 'This is a test script' },
  { id = 'test2', name = 'Test 2', description = 'This is another test script' }
}

local scriptActions = {
  test = function ()
    hs.alert.show('Test script executed')
  end,
  test2 = function ()
    hs.alert.show('Test 2 script executed')
  end
}

__SCRIPTS__ = {
  list = function ()
    return hs.json.encode(scriptDefs)
  end,
  execute = function (id)
    local scriptAction = scriptActions[id]

    if not scriptAction then
      error('User Script with id "' .. id .. '" not found')
    end

    scriptAction()
  end
}
```
