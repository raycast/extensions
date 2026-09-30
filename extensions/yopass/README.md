# Yopass

Secure sharing of secrets and passwords via [Yopass](https://github.com/jhaals/yopass). By default this extension uses [yopass.se](https://yopass.se), but you can also configure your own Yopass instance.

## Self-hosted instances

The extension requires a Yopass server **13.0.0 or newer**: the secret-creation endpoint moved from `POST /secret` to `POST /create/secret` in Yopass 13.0.0, matching the official Yopass CLI.

If you point the `Yopass API URL` preference at a self-hosted instance older than 13.0.0 (for example 12.5.0, which still uses `POST /secret`), secret creation will fail with a 404. Upgrade your instance to 13.0.0+ before using this extension with it.
