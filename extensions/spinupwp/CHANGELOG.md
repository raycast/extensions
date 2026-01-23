# SpinupWP Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Add Dashboard command to quickly open SpinupWP dashboard
- Add Servers command to list and manage servers
  - View server details and status
  - Reboot servers
  - Restart services (Nginx, Redis, PHP-FPM, MySQL)
- Add Sites command to list and manage WordPress sites
  - View site details and status
  - Purge page and object cache
  - Correct file permissions
  - Run Git deployments
  - Delete sites with confirmation
- Add Events command to view recent event history
- Add Accounts command for multi-account support
  - Manage multiple SpinupWP API accounts
  - Switch between accounts using dropdown selector
- Support for legacy single API token configuration