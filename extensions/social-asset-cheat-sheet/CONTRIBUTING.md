# Contributing to Social Asset Cheat Sheet

Thank you for considering contributing to the Social Asset Cheat Sheet extension! This document explains how to keep the social media image sizes up to date.

## Updating Image Sizes

1. The sizes data is stored in `src/data/socialSizes.json`
2. Each size entry requires:
   - `platform`: The social media platform name
   - `type`: The type of image (e.g., "Profile Photo", "Cover Photo")
   - `width`: Width in pixels
   - `height`: Height in pixels
   - `icon`: Icon name from Raycast's Icon set
   - `id`: Unique identifier (platform-type in kebab case)
   - `lastVerified`: Date when the size was last verified (YYYY-MM-DD)

## How to Contribute

1. Fork the repository
2. Update the sizes in `socialSizes.json`
3. Include a source URL where the size was verified
4. Submit a Pull Request

## Verification Sources

Please verify sizes from official documentation:
- Instagram: developers.facebook.com/docs/instagram
- Twitter/X: developer.twitter.com/en/docs
- Facebook: developers.facebook.com/docs
- LinkedIn: learn.microsoft.com/en-us/linkedin/
- YouTube: developers.google.com/youtube
- TikTok: developers.tiktok.com
- Pinterest: developers.pinterest.com
- Eventbrite: www.eventbrite.com/platform/docs
