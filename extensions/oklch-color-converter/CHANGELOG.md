# Color Converter Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add support for converting between color formats:
  - RGB (rgb, hex, hex/rgba, hsl)
  - Wide gamut (p3, oklch, oklab)
  - Linear RGB (vec, lrgb)
  - Figma P3

- Add reference calculations for common colors:
  - Green: oklch(84.06% 0.3374 142.91)
  - Purple: oklch(0.48 0.28 284.4) 
  - Yellow: oklch(94.88% 0.2331 113.29)
  - Orange: Figma P3 #ff8000ff
  - Pink: Figma P3 #f776b2ff

- Add proper gamut mapping:
  - Handle out-of-gamut colors
  - Preserve color relationships
  - Support wide gamut P3 colors

- Add format-specific features:
  - HSL calculation with proper precision
  - Vec format with reference values
  - P3 format with gamut expansion
  - Figma P3 hex format support

- Add UI features:
  - Color preview
  - Format-specific tags
  - Copy actions
  - Error handling 