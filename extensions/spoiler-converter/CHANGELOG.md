# Spoiler Converter Changelog

## [Emoji Support and Frontmost Application Detection] - 2023-8-18
- Supports Emojis
    - I just make the code ignore the spoilerizing of any text that is sandwiched between two colons but doesn't contain spaces 
        - so this would work: :emojis:, 
        - but this would not :my text: (notice how there's a space between the two words?)
- Discord Detection
    - Now, if you tried to, by accident, paste something to an app that isn't Discord, you will see a message (HUD) say that you cannot perform this action on an application that isn't discord

## [Initial Version] - 2023-08-12
