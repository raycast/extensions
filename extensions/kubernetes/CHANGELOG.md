# Kubernetes Changelog

## [Refactor Code Structure, Add More Commands] - 2025-01-28

- Refactor code structure to make it more maintainable.
- Split resources into sections when showing "All Namespaces".

Added the following commands:
- Get Events
- Get LimitRanges
- Get PodTemplates
- Get ReplicationControllers
- Get ResourceQuotas

## [Custom Namespaces] - 2025-01-26

- Allow users to specify available namespaces for each Kubernetes context.
- Fixed a bug that namespace selection is not preserved when switching between commands.

## [Support more Kubernetes resources] - 2025-01-19

Added the following commands:

- Get ConfigMaps
- Get Endpoints
- Get Namespaces
- Get PersistentVolumes
- Get PersistentVolumeClaims

## [Initial Version] - 2025-01-15

Introduced the Kubernetes extension.

Added the following commands:

- Get Pods
- Get DaemonSets
- Get Deployments
- Get StatefulSets
- Get Nodes
