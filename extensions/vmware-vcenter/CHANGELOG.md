# VMware vCenter Changelog

## [Improvement] - 2025-06-11

- Implement AI tools that can: list virtual machines, retrieve detailed information about them, open the virtual machine console, and shut down, restart, or power on virtual machines. 

## [BugFix] - 2024-05-28

- [BugFix] Fixed "TypeError: Cannot read properties of undefined (reading 'status')".

## [Feature and BugFix] - 2024-02-16

- [BugFix] Fixed "Error: missing expected parameter key: value".
- [BugFix] Fixed Power Action on VM.
- [Feature] Implemented VMRC Console Tickets. Credentials is no longer required.

## [Feature] - 2024-01-30

- [BREAKING] Moved vCenter configuration from extension preferences to LocalStorage. Is required to reconfigure vCenter Server.
- Manage multiple vCenter Servers.
- List object of all configured vCenter Servers with 'All'.
- Added 'Refresh' Action for update information. On 'Virtual Machines' Command it refresh information of selected vm.
- Added 'Open Rdp' Action for open an rdp connection using Microsoft Remote Desktop App.
- Added 'Certificate Validation Enabled' on preferences, disabled by default. If enabled it verify certificate is valid.
- Implemented cache system for improve performance.
- Updated VmGuestOS.

## [Initial Version] - 2023-09-20

- List all vms with detailed information for each one.
- Launch console (VMware Remote Console need to be installed).
- Startup, shutdown and reboot vms with and without vmware guest tools.
- List all hosts.
- List all networks.
- List all datastores with detailed information for each one.
