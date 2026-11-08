# Privacy

## Application data

Appsolutely reads the installed application catalog exposed by Raycast, application bundle metadata, and application icons. It saves folder names, folder relationships, application identities, installation paths, and ordering in Raycast LocalStorage. Recovery copies of repaired layouts also stay in LocalStorage.

Your Grid, Grid (Large), or List preference and the paths of apps recently opened through Appsolutely are also saved locally in Raycast LocalStorage. Reset Layout does not clear the recent-app history. High-resolution application icons and folder previews are prepared only in Grid (Large).

High-resolution icon caches and generated folder previews are stored in the extension's support directory. Cache metadata includes local application paths. Appsolutely does not add encryption to these files; they rely on the operating system and Raycast's local storage protections. Reset Layout resets organization but does not purge icon caches or prior recovery copies.

The extension's source contains no network requests, analytics, remote image loading, account integration, or automatic error-reporting calls. Native helper commands only read metadata or render icons. Errors can display local paths in Raycast toasts; inspect the screen before sharing an error screenshot.

Development tooling is separate: npm downloads dependencies, Raycast lint fetches its schema and checks the configured Store author, and GitHub receives files when they are pushed.
