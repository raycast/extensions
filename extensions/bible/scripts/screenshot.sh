# The screenshot needs to be 2000px wide by 1250px high
# On my 2021 MBP M1 Pro 14", the pixel ratio is 2
w=1000
h=625

# If I align the Raycast window with the snaps, then this
# is the top-right corner position of the screenshot rectangle:
x=256
y=60

# Sleep a few seconds to give some time to set up the Raycast window,
# then take a screenshot, saving it to the directory where the script was run.
sleep 3;
/usr/sbin/screencapture -R$x,$y,$w,$h screenshot_$(date -Iseconds).png
