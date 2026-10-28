---
$schema: .github/schemas/project-docs-index.schema.json
schemaVersion: 2
title: Raycast
summary: Desktop companion extension and its stable-coupled publication contract.
overview: The Raycast companion provides fast search and actions over Blume data while remaining
  compatible with the stable desktop and helper protocol.
responsibleFor:
  - id: raycast-experience
    label: Raycast experience
    description: Search, display, navigation, and actions exposed through the Raycast extension.
  - id: stable-compatibility
    label: Stable compatibility
    description: Compatibility with the stable desktop helper and the data contracts available to
      released users.
notResponsibleFor:
  - id: desktop-release
    label: Desktop release and updates
    description: Desktop packaging, signing, and updater feeds belong to apps/desktop and
      services/desktop-updates.
  - id: product-backends
    label: Product backends
    description: The extension consumes stable capabilities; it does not own release-coupled services.
  - id: sidecar-ui
    label: Sidecar product UI
    description: The shared desktop and Web Lab product interface belongs to packages/sidecar/ui.
relatedProjects:
  - projectPath: apps/desktop
    description: Provides the stable local product and helper capabilities the extension accompanies.
  - projectPath: packages/app/core
    description: Owns shared product semantics exposed through compatible adapters.
deploymentSpecialCases:
  - id: stable-coupled-store-publication
    title: Stable-coupled store publication
    catalogIds:
      - raycast-extension
    stages:
      - main
      - stable
    description: Main validates only. Store publication follows verified stable compatibility and never
      follows canary promotion.
pointers: []
---
