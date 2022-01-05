use framework "Cocoa"
use scripting additions

global ca
set ca to current application

to isModifierPressed(modifier)
    ((ca's NSEvent's modifierFlags()) / modifier as integer) mod 2 is equal to 1
end isModifierPressed

-- wait until modifier is up before continuing
repeat until not isModifierPressed(ca's NSEventModifierFlagCommand)
    delay 0.1 -- sad poll/wait loop :(
end repeat
