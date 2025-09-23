# Copy Browser URL

A Raycast extension that copies the current browser tab URL to your clipboard with tracking parameters removed.

## Features

- 🌐 Gets the URL from your current browser tab
- 🧹 Removes common tracking parameters (UTM, Facebook, Google Analytics, etc.)
- 📋 Copies the clean URL to your clipboard
- ✅ Shows confirmation toast when complete

## Supported Browsers

- Chrome
- Safari  
- Firefox
- Arc
- Brave
- Vivaldi
- Orion

## Usage

Simply run the "Copy Browser URL" command and the current browser tab URL will be copied to your clipboard with tracking parameters removed.

## Tracking Parameters Removed

- Google Analytics: `utm_*`, `gclid`, `gclsrc`, `gbraid`, `wbraid`
- Facebook: `fbclid`, `fbc`, `fbp`
- Twitter/X: `twclid`
- Microsoft/Bing: `msclkid`
- Amazon: `tag`, `ref`, `ref_`
- General tracking: `_ga`, `_gl`, `_ke`, `mc_*`
- And many more...
