# Choosing a Screenshot Hotkey

Open Raycast, find **Capture and Copy**, press **Cmd+K**, and choose **Configure Command → Set Hotkey**. Record the shortcut you want. Raycast saves the binding; the helper follows the modifiers held when it starts, so there is no second shortcut preference to keep in sync.

The current default is Control+Command+4. To use Command+Shift+4 instead, first disable or reassign macOS's conflicting shortcut in **System Settings → Keyboard → Keyboard Shortcuts → Screenshots**, then assign it in Raycast. This installation does not change the Mac's screenshot shortcuts automatically.

Hold the chosen modifiers, press the shortcut's character key once and draw a new screenshot. Further presses of the same key while the modifiers remain held select older screenshots. Release a required modifier to finish. The confirmation HUD shows the copied count and remains briefly without taking focus.

A shortcut that has no held modifiers can still trigger a single capture, but it cannot support hold-to-select-history. Native Screenshot may treat held modifiers such as Shift as selection modifiers while drawing; the physical behavior of a newly chosen shortcut should be checked on the user's Mac.

The current installation is a Raycast Script Command. Once packaged as a Store extension, its command hotkey will be configurable through Raycast's native extension/command settings.
