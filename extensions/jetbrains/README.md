# JetBrains Toolbox Search Recent Projects

This extension should work out of the box. If you have multiple JetBrains apps installed, you can choose a priority app to bump to the top of the list in preferences.

## Issues

### Opening projects?

1.  Have you enabled the shell scripts in JetBrains Toolbox preferences?
    1. If the extension is complaining that it can't find the scripts, try unchecking and re-checking the option in JetBrains Toolbox
2.  Have you set a custom path to your shell scripts? Add that to the extension preferences
3.  By default fallback to protocol url is disabled, if you really don't want to enable the shell scripts, enable the fallback to use the unreliable url method of opening projects.

### Missing or unwanted projects?

1.  By default the extension will search only the latest project history file, this could mean older projects do not show up in the list, you can enable the setting to search all project files in preferences.
2.  In contrast, if older projects are showing up and you _don't_ want to see them, ensure the option is unchecked and the extension will only look at the latest project file.
