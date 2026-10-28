# Raycast Store Submission Checklist

## Store listing

- **Title and slug:** Energy Console (`energy-console`). A live Raycast Store search and a search of `raycast/extensions` found no match on 2026-10-28. Availability is not reserved until Raycast accepts the submission.
- **Description:** Unofficial community tool to monitor and control compatible EcoFlow devices with your own API keys; not affiliated with or endorsed by EcoFlow.
- **Icon:** Generic energy-device artwork with no visible EcoFlow logo or wordmark. `needs_evidence`: retain the source or provenance record for the artwork if Raycast requests it.
- **Screenshots:** Three 2000 × 1250 PNGs in `metadata/` show the device dashboard, device detail, and control selection with fictitious demo devices. The older AI capture showing the former extension name was removed. `needs_evidence`: confirm these were captured with Raycast Window Capture and **Save to Metadata**; the PNG files alone do not prove the capture method.

## EcoFlow's response

EcoFlow confirmed that the described community integration may use its public Developer Platform APIs when each user supplies their own access and secret keys and requests go directly from the user's Mac, subject to the applicable agreement and API policies. EcoFlow did **not** authorize its name as the extension title or its logo and other brand assets. EcoFlow does not initiate, develop, endorse, certify, or warrant this extension. This is why the title, slug, command subtitles, AI tool titles, and Store description use independent branding; EcoFlow appears only as a factual compatibility or API reference.

Do not describe the extension as official or endorsed. Do not add EcoFlow logos, product images, or copied marketing text. `needs_evidence`: The private correspondence is held by the author; share it with Raycast only through a suitable private channel if requested.

## Technical checks

- [x] Manifest declares macOS support, MIT licensing, categories, and password preferences for both Developer Platform keys.
- [x] Requests go directly to `https://api.ecoflow.com` with no shared server, analytics, or tracking.
- [x] Unknown hardware and undocumented controls remain read-only; physical changes require confirmation.
- [x] Remote views provide loading and empty states, and errors are surfaced to users.
- [x] README documents credentials, supported devices, privacy, control limits, and AI behavior.
- [x] `npm ci`, `npm run check`, and `npm audit --omit=dev` passed locally after the rename; 85 tests passed and Raycast validated the icon and metadata.
- [ ] Inspect the current PR checks after pushing the rename.
- [ ] Confirm Raycast accepts the new title, slug, icon, screenshots, and permission summary during review.

## References

- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Manifest](https://developers.raycast.com/information/manifest)
- [EcoFlow Developer Platform API](https://developer-eu.ecoflow.com/us/document/introduction)
