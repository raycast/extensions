# Kafka UI

A Raycast extension for inspecting Apache Kafka consumer group lag and browsing topics through [Kafbat UI](https://github.com/kafbat/kafka-ui) (formerly Provectus Kafka UI).

This extension connects to your Kafka UI instances and provides quick access to consumer group lag monitoring and topic browsing directly from Raycast.

## Credits

This extension is powered by the [Kafbat UI](https://github.com/kafbat/kafka-ui) open-source project. Kafka UI provides the REST API that this extension consumes. All data is fetched from your self-hosted or managed Kafka UI instances.

## Features

- **Kafka Search Consumer Groups** - Browse consumer groups, inspect per-topic and per-partition lag with color-coded severity (OK / Warning / Critical)
- **Kafka Search Topics** - Browse Kafka topics grouped by prefix, view partition and replication details, see consumer groups per topic
- **Multi-Environment** - Configure any number of Kafka UI environments (DEV, QA, PROD, etc.) and switch between them from a dropdown
- **Per-User Configuration** - Each team member manages their own environments independently through the Kafka Configuration Manager command

## Setup

1. Install the extension from the Raycast Store
2. Run the **Kafka Configuration Manager** command
3. Add your first environment with:
   - **Name**: A display label (e.g. "DEV", "Staging", "Production")
   - **Kafka UI URL**: The base URL of your Kafka UI instance (e.g. `https://kafka-ui.internal.example.com`)
   - **Cluster Name**: The cluster name as configured in your Kafka UI instance (visible in the Kafka UI URL: `/ui/clusters/<CLUSTER_NAME>/...`)
   - **Color**: A color to visually distinguish this environment
4. Optionally set **Topic Prefixes** to filter topics by prefix (comma-separated)
5. Optionally adjust **Lag Warning Threshold** (default: 1,000) and **Lag Critical Threshold** (default: 10,000) in extension preferences

## Keyboard Shortcuts

| Shortcut    | Action                                                |
| ----------- | ----------------------------------------------------- |
| Cmd+O       | Open in Kafka UI browser                              |
| Cmd+Shift+O | Open consumer groups page / topic in Kafka UI         |
| Cmd+R       | Refresh data                                          |
| Cmd+C       | Copy item to clipboard                                |
| Cmd+Shift+F | Toggle deep search (all topics vs. filtered prefixes) |

## Requirements

- A running [Kafbat UI](https://github.com/kafbat/kafka-ui) instance accessible from your machine
- Network access to the Kafka UI REST API
