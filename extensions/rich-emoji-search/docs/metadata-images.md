# Validating metadata images before pushing

`raycast/extensions` runs `scripts/check_metadata_images.py` on every changed
file under `metadata/`, which delegates to `scripts/check_raycast_images.py`.
The rules it enforces:

- exactly 2000×1250
- each side padded 8%–17% of the canvas, target 12.5% — horizontal measured
  against width, vertical against height
- left/right and top/bottom padding within 4% of each other

"Padding" is the gap between the canvas edge and the detected window. Because
the two axes are measured against different dimensions, a window wider than
1.6:1 cannot sit at 12.5% on both axes; pick a size where both land inside the
band instead, and centre it so both asymmetry checks come out at zero.

Run the same validator locally rather than guessing:

```sh
curl -sSLO https://raw.githubusercontent.com/raycast/extensions/main/scripts/check_raycast_images.py
python3 -m venv /tmp/rcv && /tmp/rcv/bin/pip install -q pillow numpy
/tmp/rcv/bin/python check_raycast_images.py metadata/*.png --verbose
```

`--verbose` prints the detected window bbox and the raw percentages, which is
what you need when a shot fails: the gradient detector occasionally latches onto
an inner edge rather than the window frame, and its bbox is the thing to fix.
