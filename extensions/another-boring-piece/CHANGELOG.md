# Changelog

## [Slug Rename & Title Polish] - 2026-05-18

- Renamed internal slug from `basalt-wallpapers` to `another-boring-piece` (the new brand). The Store listing remains continuous via Raycast-side redirect.
- Dropped trailing period in Store title: `Art Wallpapers.` → `Art Wallpapers`.

## [Rebrand & Auto Switch] - 2026-05-16

- Rebranded extension as **Art Wallpapers. — Another boring piece. Daily.**
- New command **Auto Switch Wallpaper**: rotate wallpapers automatically in the background with a 30-minute, 1-hour, or 1-day refresh interval, plus an optional HUD on every change.
- Migrated API to `service.anotherboring.day` and outbound art-detail links to `anotherboring.day`.

## [Caching Improvements] - 2026-04-30

- Reuse cached wallpaper files when setting the same wallpaper again.
- Prevent wallpaper cache and download filename collisions.
- Limit cached wallpaper files stored by the extension.
- Refresh random wallpaper results and update Raycast dependencies.

## [Initial Release] - 2026-01-26

- Initial release of Basalt for Raycast.
- View today's hand-picked wallpapers.
- Set random wallpapers from the collection.
- Download wallpapers to disk.
