# Channel Mixer Helper

Raycast extension that converts a source HEX color into stable Photoshop
Channel Mixer recommendations for a target HEX color.

## Usage

1. Search Raycast for **Convert HEX with Channel Mixer**.
2. Enter the source and target HEX values. Both `#RGB` and `#RRGGBB` are supported.
3. Press `⌘K` and choose **Pick Source Color from Screen** or **Pick Target Color from Screen** when needed.
4. Submit the form, then copy one output channel or all recommendations from the result page.
5. Open **Conversion History** to review recent conversions.

Screen color picking uses Raycast's Color Picker extension. If it is not
installed, the color-picking action opens its Raycast page.

## Algorithm

The stable mode uses shared Rec. 601 perceptual-luminance weights for all
three output channels: R 29.9%, G 58.7%, and B 11.4%. It scales that shared
mix up to a 100% gain ceiling and uses Photoshop Channel Mixer Constant for any
remaining lift. This avoids independently amplifying a noisy input channel,
which can create unwanted color casts in photos and fabric textures.

The displayed coefficients use one decimal place. The predicted output is
calculated from those displayed values and can differ from the target by one
or two levels because Photoshop commonly displays channel values as integers.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```
