# Amazon AWS Changelog

## [Bug fix for EC2 Instances & UX improvement for SQS command] - 2022-05-23

- Manage the case where there is no public ip in EC2 ([#1715](https://github.com/raycast/extensions/pull/1715))
- Loading indicators for queues attributes ([#1716](https://github.com/raycast/extensions/pull/1716))

## [DynamoDB tables command] - 2022-05-10

- Added DynamoDB tables ([#1606](https://github.com/raycast/extensions/pull/1606))

## [Improvement] - 2022-04-07

- Added AWS Profile preferences ([#1410](https://github.com/raycast/extensions/pull/1410))

## [Full list of resources] - 2022-04-06

Started fetching resources using the paginated responses from AWS to get a full list of resources. ([#1146](https://github.com/raycast/extensions/pull/1146))

## [Extension screenshots] - 2022-04-01

Added screenshots for the Raycast store ([#1259](https://github.com/raycast/extensions/pull/1259))

## [CloudFormation command] - 2022-03-03

Added a new command to list CloudFormation stacks ([#950](https://github.com/raycast/extensions/pull/950))

## [Speed improvement for CodePipeline command] - 2022-02-03

Improved speed for listing pipelines via incremental loading ([#769](https://github.com/raycast/extensions/pull/769))

## [Bug fix for CodePipeline command] - 2022-01-24

Fixed a bug where pipelines without executions would break the CodePipeline comand ([#732](https://github.com/raycast/extensions/pull/732))

## [Console command] - 2021-12-13

Added new command to open services in the AWS console ([#473](https://github.com/raycast/extensions/pull/473))

## [CodePipeline command] - 2021-11-29

Added new command to list CodePipeline pipelines ([#433](https://github.com/raycast/extensions/pull/433))

## [SQS command] - 2021-11-07

Added new command to list SQS queues ([#339](https://github.com/raycast/extensions/pull/339))

## [Added Amazon AWS] - 2021-11-10

Initial version of the extension with a command to list EC2 instances ([#316](https://github.com/raycast/extensions/pull/316))
