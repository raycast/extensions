# Auto Keyboard Shortcuts

Configure sequences of keyboard shortcuts to run via Quicklinks

## Commands

- New Shortcut Sequence
    - Opens a form to configure a new sequence of keyboard shortcuts for easy access in the future
    - To use keycodes instead of key characters, use the following format in the keystrokes field: ASCII character 31 or select a predefined key from the list
- Run Shortcut Sequence [sequenceName]
    - Opens the list of configured sequences, allowing you to run, edit, delete, or save them as Quicklinks
    - If the provided `sequenceName` precisely matches the name of an existing sequence, it will be executed automatically

## Adding New Sequences

To create a new sequence, run the New Shortcut Sequence command to open the editor form. You can then provide a name, icon, and description for the sequence indicating what the sequence accomplishes. The number of shortcuts can be dynamically edited at the end of the page. Just add a new one or remove the last. For example, to split and then un-split a Terminal window, you would create two distinct keyboard shortcuts. To compensate for loading times, you can add a delay before the execution of the shortcut.

You must provide the keystrokes and modifiers for each shortcut in the sequence. Continuing with the previous example, the keyboard shortcut to split a Terminal window is Command+D, while the shortcut to un-split the window is Shift+Command+D. For the first shortcut, the keystroke would therefore be D, and the modifier would be Command. Likewise, for the second, the keystroke would be D again, and the modifiers would be both Shift and Command. The order of the modifiers does not matter. For special keys, you can either enter a specific [key code](https://macbiblioblog.blogspot.com/2014/12/key-codes-for-function-and-special-keys.html) into the keystrokes field or select a predefined from the keycodes section.

You can then save the shortcut sequence and run it via the Run Shortcut Sequence command. From the list of sequences you've made, you can create Quicklinks to run specific shortcut sequences from Raycast's root search.