# On my 2021 MBP M1 Pro 14", the screen resolution is 3024px x 1964px
# aka 1512 x 982 with a pixel ratio of 2
# So all numbers below are halfed
# You can find your own information here: https://duckduckgo.com/?q=screen+resolution
screenW=1512
screenH=982

# The screenshot needs to be 2000px wide by 1250px high
screenshotW=1000
screenshotH=625

# The window has to have a horizontal margin of 250px
# and a vertical margin of 150px
marginX=125
marginY=75

# Top left corner position of the raycast window, when it is snapped to the raycast guides
raycastX=380
raycastY=135

# This is the top-right corner position of the screenshot rectangle:
((screenshotX=$raycastX-$marginX))
((screenshotY=$raycastY-$marginY))

# Sleep a few seconds to give some time to set up the Raycast window...
sleep 3
# ... then take a screenshot, saving it to the directory where the script was run.
/usr/sbin/screencapture -R$screenshotX,$screenshotY,$screenshotW,$screenshotH screenshot_$(date -Iseconds).png
