# Kafka extension

> Extension to quickly consult topics and consumers of kafka broker

## Configuration

| Name            | Required | Default     | Example          | Description                                                       |
|-----------------|----------|-------------|------------------|-------------------------------------------------------------------|
| configDirectory | Yes      | `~/.kafka/` | `/kafka-config/` | Configuration directory containing [env files](#environment-file) |

### Environment file

Environment file must be a json in the configuration directory with following
fields :

````typescript
export interface KafkaEnv {
  // env name to display on raycast dropdown
  name: string;
  // to filter topics by keyword(s)
  filterTopics?: string[];
  // to filter consumers by keyword(s)
  filterConsumers?: string[];
  // kafka js configuration for broker, authentication, etc
  kafkaJs: KafkaConfig;
}
````

Following [kafkaJS](https://kafka.js.org/) configuration is used by default :

````typescript
const defaultConfiguration = {
  connectionTimeout: 10000,
  requestTimeout: 30000,
  logLevel: logLevel.ERROR
};
````

More info on configuring
[kafkaJS](https://kafka.js.org/) [here](https://kafka.js.org/docs/configuration)

_Example_

````json
{
  "name": "Dev",
  "filterTopics": [
    "my-prefix-for-dev"
  ],
  "filterConsumers": [
    "dev",
    "def"
  ],
  "kafkaJs": {
    "brokers": [
      "kafka-host:kafka-port"
    ],
    "sasl": {
      "mechanism": "plain",
      "username": "user",
      "password": "password"
    }
  }
}

````

## Kafka command

- List and consult topic configurations
- List consumers with state, members and overall lag

## Configuration

| Name                        | Required | Default | Example                | Description                                  |
|-----------------------------|----------|---------|------------------------|----------------------------------------------|
| extractRegex                | No       | -       | `topic_(.*)_(.*)_(.*)` | Regex to extract information from topic name |
| extractTitleGroup           | No       | -       | 1                      | Group to get from regex to display title     |
| extractSubTitleGroup        | No       | -       | 2                      | Group to get from regex to display subtitle  |
| extractMetadataNameAndGroup | No       | -       | Application=3          | Extract metadata from regex                  |

Note: in this example, with a topic named `topic_NAME_OWNER_APP`, the title
would be **NAME**, the subtitle **OWNER**, and in the side panel we would have
the following metadata **Application=APP**. If you don't set extractRegex full
topic name will be displayed.

## Kafka menu bar command

Have kafka in menu bar with background actualization every 5 minutes

## Configuration

| Name                  | Required | Default | Description                                                                                            |
|-----------------------|----------|---------|--------------------------------------------------------------------------------------------------------|
| hideWithoutLag        | No       | true    | Hide consumers without lag to avoid long lists                                                         |
| sendNotification      | No       | false   | Send macos notification if at least one consumer has lag                                               |
| notificationThreshold | No       | 1000    | Notification threshold to not exceed to send macos notification (need `sendNotification` to be `true`) |
