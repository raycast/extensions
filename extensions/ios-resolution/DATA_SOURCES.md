# Device data sources

Verified on September 16, 2026. This record covers the 2025–2026 additions and the corrections listed below, not a complete audit of the historical catalogue.

## Display specifications

Pixel dimensions, PPI, and advertised diagonals come from Apple's technical specifications. Phones, tablets, and watches use portrait width × height; MacBooks use landscape width × height. New aspect ratios are reduced from the physical pixel dimensions.

| Devices                              | Apple specifications                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| iPhone Duo, inner and outer displays | [iPhone Duo](https://www.apple.com/iphone-duo/specs/)                                                |
| iPhone 18 Pro and Pro Max            | [iPhone 18 Pro](https://www.apple.com/iphone-18-pro/specs/)                                          |
| iPhone 17e                           | [iPhone 17e](https://www.apple.com/iphone-17e/specs/)                                                |
| iPad (A16)                           | [iPad](https://www.apple.com/ipad-11/specs/)                                                         |
| iPad Air with M3                     | [11-inch](https://support.apple.com/en-us/122241), [13-inch](https://support.apple.com/en-us/122242) |
| iPad Air with M4                     | [iPad Air](https://www.apple.com/ipad-air/specs/)                                                    |
| iPad Pro with M5                     | [iPad Pro](https://www.apple.com/ipad-pro/specs/)                                                    |
| Apple Watch SE 3                     | [SE 3](https://support.apple.com/en-us/125094)                                                       |
| Apple Watch Series 11                | [Series 11](https://support.apple.com/en-us/125093)                                                  |
| Apple Watch Series 12                | [Series 12](https://www.apple.com/apple-watch-series-12/specs/)                                      |
| Apple Watch Ultra 3                  | [Ultra 3](https://support.apple.com/en-us/125095)                                                    |
| Apple Watch Ultra 4                  | [Ultra 4](https://www.apple.com/apple-watch-ultra-4/specs/)                                          |
| MacBook Neo                          | [MacBook Neo](https://www.apple.com/macbook-neo/specs/)                                              |
| MacBook Air with M5                  | [MacBook Air](https://www.apple.com/macbook-air/specs/)                                              |
| MacBook Pro with M5 Pro and M5 Max   | [MacBook Pro](https://www.apple.com/macbook-pro/specs/)                                              |

Apple Watch diagonals in the new entries are calculated as `sqrt(width² + height²) / ppi`, rounded to three decimal places and prefixed with `~`. They describe the bounding rectangle, not the visible area within rounded corners. Series 11/12 and Ultra 3/4 use Apple's published 326 PPI; they do not inherit the older entries' PPI.

## Logical resolutions and scale factors

For the new iPhone 17e/18 Pro, iPad, and Apple Watch entries, physical dimensions, PPI, and scale were independently checked against Apple's installed CoreSimulator device profiles:

```text
/Library/Developer/CoreSimulator/Profiles/DeviceTypes/<device>.simdevicetype/Contents/Resources/capabilities.plist
```

The `capabilities.displays` entry with `displayType = integrated` supplies `width`, `height`, `hdpi`, and `scale`. Logical dimensions are calculated using that device's verified scale. The Xcode 27 profiles include both iPhone 18 Pro sizes, both Watch Series 12 sizes, and Watch Ultra 4.

iPhone Duo has two separate entries. Apple publishes 1878 × 2670 pixels at 430 PPI for the inner display and 1398 × 2034 pixels at 460 PPI for the outer display. No Duo profile was present in the installed Simulator device types, and Apple's checked specifications and developer guidance did not establish a scale factor or point dimensions. Those three fields remain `null`. In particular, divisibility by three is not evidence for a 3× scale.

MacBooks use the 2× Retina backing scale described in Apple's [High Resolution Explained](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Explained/Explained.html). The new 14-inch and 16-inch MacBook Pro entries retain the existing native 2× reference sizes, 1512 × 982 and 1728 × 1117. These are reference modes, not a claim about the user's current display setting. MacBook Air and Neo default desktop dimensions were not established from the checked Apple specifications and remain `null`; the panel dimensions are verified separately.

Unknown values are displayed as **Not yet verified**, excluded from individual copy actions, and preserved as `null` in JSON export. Existing entries with known values retain their display and copy behavior.

## Release dates

New entries use the first retail availability date, not the announcement or preorder date. Announced future devices are included with their announced availability dates.

| Availability       | Devices                                                                   | Apple announcement                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| March 12, 2025     | iPad (A16), iPad Air with M3                                              | [March iPad update](https://www.apple.com/newsroom/2025/03/apple-introduces-ipad-air-with-powerful-m3-chip-and-new-magic-keyboard/)        |
| September 19, 2025 | Watch SE 3, Series 11, Ultra 3                                            | [September lineup](https://www.apple.com/newsroom/2025/09/get-ready-to-discover-the-next-generation-of-iphone-apple-watch-and-airpods/)    |
| October 22, 2025   | iPad Pro with M5, 14-inch MacBook Pro with M5                             | [M5 availability](https://www.apple.com/newsroom/2025/10/new-ipad-pro-14-inch-macbook-pro-and-apple-vision-pro-now-available/)             |
| March 11, 2026     | iPhone 17e, iPad Air with M4, MacBook Neo, M5 Air, M5 Pro/Max MacBook Pro | [March lineup](https://www.apple.com/newsroom/2026/03/macbook-neo-iphone-17e-ipad-air-with-m4-and-more-are-now-available/)                 |
| September 18, 2026 | iPhone 18 Pro and Pro Max, Watch Series 12 and Ultra 4                    | [September lineup](https://www.apple.com/newsroom/2026/09/get-ready-to-experience-iphone-18-pro-the-new-apple-watch-lineup-and-airpods-5/) |
| October 23, 2026   | iPhone Duo                                                                | [iPhone Duo announcement](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)                                                |

## Corrections to existing entries

- The 13.6-inch MacBook Air with [M2](https://support.apple.com/en-us/111867), [M3](https://support.apple.com/en-us/118551), and [M4](https://support.apple.com/en-us/122209) has a 2560 × 1664 panel, not the 14-inch MacBook Pro's 3024 × 1964 panel.
- The six 13.6-inch/15.3-inch M2–M4 Air entries contained MacBook Pro logical sizes. These were cleared pending verification of the default scaled desktop sizes. Their aspect ratios now reflect their physical dimensions.
- The 14-inch M5 MacBook Pro became available October 22, 2025, rather than November 4.
