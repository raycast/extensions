# ChangeLog for DDEV Raycast Extension

## Version 1.0
Date: 2026-06-26
Feature:
1. List all ddev projects (ddev list)
2. Launch web page for project and login (ddev launch, ddev drush uli | xargs open)
3. Start, stop, restart projects (ddev start, ddev stop, ddev restart)
4. List, take, restore snapshots (ddev snapshot, ddev snapshot --list, ddev snapshot restore)
5. Rename project (ddev snapshot -> ddev stop -> ddev config -> ddev start -> ddev snapshot restore -> ddev snapshot --clean-up)
