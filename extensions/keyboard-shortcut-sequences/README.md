# Auto Keyboard Shortcuts

Configure sequences of keyboard shortcuts to run via Quicklinks

## Commands

- New Shortcut Sequence
    - Opens a form to configure a new sequence of keyboard shortcuts for easy access in the future
    - To use keycodes instead of key characters, use the following format in the keystrokes field: ASCII character 31
- Run Shortcut Sequence [sequenceName]
    - Opens the list of configured sequences, allowing you to run, edit, delete, or save them as Quicklinks
    - If the provided `sequenceName` precisely matches the name of an existing sequence, it will be executed automatically

## Adding New Sequences

To create a new sequence, run the New Shortcut Sequence command to open the editor form. You can then provide a name, icon, and description for the sequence indicating what the sequence accomplishes. In the "Number Of Shortcuts" field, specify how many keyboard shortcuts will be executed in the sequence. For example, to split and then un-split a Terminal window, you would enter 2 since two distinct keyboard shortcuts are to be performed.

You must provide the keystrokes and modifiers for each shortcut in the sequence. Continuing with the previous example, the keyboard shortcut to split a Terminal window is Command+D, while the shortcut to un-split the window is Shift+Command+D. For the first shortcut, the keystroke would therefore be D, and the modifier would be Command. Likewise, for the second, the keystroke would be D again, and the modifiers would be both Shift and Command. The order of the modifiers does not matter.

You can then save the shortcut sequence and run it via the Run Shortcut Sequence command. From the list of sequences you've made, you can create Quicklinks to run specific shortcut sequences from Raycast's root search.