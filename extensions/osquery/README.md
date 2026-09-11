<p align="center">
  <img src="assets/osquery.png" width="150" height="150" alt="osquery logo">
</p>

# Osquery

A Raycast extension for exploring [Osquery](https://osquery.io/) tables, columns, and building queries.

## Commands

| Command         | Description                                            |
| --------------- | ------------------------------------------------------ |
| Search Tables   | Browse and search osquery tables with platform filters |
| Find Column     | Find columns across tables and build JOIN queries      |
| Query Templates | Common query templates organized by category           |
| Validate Query  | Validate SQL queries against the schema                |

## Configuration

| Preference       | Description                      | Default |
| ---------------- | -------------------------------- | ------- |
| Default Platform | Filter tables by OS              | macOS   |
| Fleet URL        | Your Fleet server URL (optional) | -       |

## Schema Updates

The extension includes osquery schema `5.21.0`. To update:

```bash
npm run update-schema
```

See [scripts/README.md](scripts/README.md) for details.
