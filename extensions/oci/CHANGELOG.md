# Oracle Cloud Changelog

## [Manage Bucket Objects + View NoSQL Database] - {PR_MERGE_DATE}

- view NoSQL Databases
- view objects in buckets w/ filesize
    1. upload object
    2. delete object

## [View Object Storage Buckets + Implement Provider w/ Context] - 2025-07-14

- add initial "Object Storage" command to view buckets
- `dev`: implement Provider w/ Context so checks can be shared

## [Add Terminate Instance Action] - 2025-06-03

- (Confirm and) Terminate Instance
- Add "Open in OCI" `Action`

## [Perform Instance Actions] - 2025-02-13

- Add instance actions:
    - Reset
    - Start
    - Stop
- Show a proper `Detail` view with information when "provider" fails. Previously, extension would crash (ref: [Issue #16962](https://github.com/raycast/extensions/issues/16962)).
- Show instance "Created" `Accessory`

## [Initial Version] - 2024-12-20

- View Instances
    - View VNIC Attachments