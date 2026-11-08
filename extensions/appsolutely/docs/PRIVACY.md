# Privacy

## Application data

Appsolutely reads the installed application catalog exposed by Raycast, application bundle metadata, and application icons. It saves folder names, folder relationships, application identities, installation paths, and ordering in Raycast LocalStorage. Recovery copies of repaired layouts also stay in LocalStorage.

Your Grid, Grid (Large), or List preference and the paths of apps recently opened through Appsolutely are also saved locally in Raycast LocalStorage. Reset Layout does not clear the recent-app history. High-resolution application icons and folder previews are prepared only in Grid (Large).

High-resolution icon caches and generated folder previews are stored in the extension's support directory. Cache metadata includes local application paths. Appsolutely does not add encryption to these files; they rely on the operating system and Raycast's local storage protections. Reset Layout resets organization but does not purge icon caches or prior recovery copies.

The extension's source contains no network requests, analytics, remote image loading, account integration, or automatic error-reporting calls. Native helper commands only read metadata or render icons. Errors can display local paths in Raycast toasts; inspect the screen before sharing an error screenshot.

Development tooling is separate: npm downloads dependencies, Raycast lint fetches its schema and checks the configured Store author, and GitHub receives files when they are pushed.

## Repository sharing review

The files selected for the initial repository upload were reviewed for credentials, private keys, personal filesystem paths, account details, runtime data, and screenshot metadata.

- No credential, private key, personal home-directory path, or private email address was found embedded in the project files selected for upload. Test paths use synthetic examples.
- Initial screenshots revealing third-party application inventory were replaced with stock macOS apps in a temporary demonstration layout. The project owner subsequently selected a Home screenshot for the README cover; that image intentionally includes visible application names, icons, and desktop wallpaper. It was included at the owner's explicit request.
- Included PNG files were re-encoded to remove metadata and checked visually. The demonstration captures show only the extension window; the owner-supplied cover also includes surrounding wallpaper. Re-encoding preserves the image pixels.
- Local settings, environment files, credential files, dependency directories, generated output, and runtime caches are excluded by `.gitignore`.
- The package's Raycast author handle is intentional Store metadata. Git commit attribution uses the existing Git configuration, as requested by the repository owner; that name and email are visible in commit history to anyone with repository access.

Runtime LocalStorage, icon caches, recovery copies, GitHub authentication material, and machine-specific configuration are not included in the repository. This review covers the project's source and shareable artifacts; it is not a security audit of macOS, Raycast, GitHub, or all upstream dependency implementations.

Before making a repository public or adding new screenshots, repeat the content review. A private repository limits access but does not remove information from Git history.
