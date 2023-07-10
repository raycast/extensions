# Amazon AWS Changelog

## [Fix Broken Authentication] - 2023-05-06

- Fix regression from AWS Vault changes that affected all non-aws-vault users.

## [Extend Support AWS Vault] - 2023-04-28

- Add support for people using aws-vault with the GetSessionToken API call.
- Add support for aws-vault usage with a master-credentials approach.

## [Support AWS Vault] - 2023-04-03

- Add support for people using aws-vault to manage their sessions.

## [Add Profile Script Command] - 2023-03-15

- Add "Run Profile Script" command that allows users to list profiles and run a custom script for them.

## [Add Show All Action] - 2023-03-08

- Add "Show All" action to SSM Parameters to bypass the requirement of needing four characters for search.

## [Fix Profile Dropdown] - 2023-03-04

- Fix profile dropdown issue when reading from credentials file

## [Renamed command] - 2023-02-03

- Renamed Elasticsearch Service to OpenSearch Service

## [ECS Command] - 2023-01-06

- Added command for forcing a new deployment on a given service

## [CloudFormation Resources List] - 2022-12-25

- Added support for viewing CloudFormation resources from within Raycast ([#4054](https://github.com/raycast/extensions/pull/4054))

## [ECS Command] - 2022-12-14

- Added support for viewing ECS cluster, services, task, task definitions, containers and container logs from within Raycast or the browser
- Added support for viewing Lambda logs from within Raycast or the browser

## [Secrets Manager Command] - 2022-12-13

- Add "Secrets Manager" command ([#3865](https://github.com/raycast/extensions/pull/3843))

## [CloudWatch & SSM Command] - 2022-12-10

- Add "CloudWatch Log Groups" command ([#3843](https://github.com/raycast/extensions/pull/3843))
- Add "SSM Parameters" command ([#3843](https://github.com/raycast/extensions/pull/3843))

## [UI/UX Tweaks & Fixes] - 2022-12-09

- Simplify UI/UX using Raycast icons, consistent actions, and more ([#3770](https://github.com/raycast/extensions/pull/3770))
- Cleanup codebase and improve code readability ([#3770](https://github.com/raycast/extensions/pull/3770))
- Fix two minor bugs related to data fetching ([#3770](https://github.com/raycast/extensions/pull/3770))
- Update readme, screenshots and copy ([#3770](https://github.com/raycast/extensions/pull/3770))

## [Support AWS Profile Switch] - 2022-11-30

Add "Profile" select replacing the "Profile" and "Region" setting ([#3612](https://github.com/raycast/extensions/pull/3612))

## [S3 Command] - 2022-11-18

Added a new command to list S3 buckets and objects ([#3589](https://github.com/raycast/extensions/pull/3589))

## [Lambda Command] - 2022-11-15

Added a new command to list Lambda functions ([#3525](https://github.com/raycast/extensions/pull/3525))

## [Improve Data Fetching] - 2022-11-14

Use Raycast's API for all data fetching ([#3421](https://github.com/raycast/extensions/pull/3421))

## [Add SQS Queue Purge Action] - 2022-10-26

Add purge action to queue list item ([#3299](https://github.com/raycast/extensions/pull/3299))

## [Improve icon usage] - 2022-08-01

Use built-in icons & tweak Cloudformation list item UI ([#2431](https://github.com/raycast/extensions/pull/2431))

## [Migrate to Raycast API 1.36.0 + ECS Clusters command] - 2022-07-15

- Added ECS Clusters ([#2254](https://github.com/raycast/extensions/pull/2254))
- Migrate to Raycast API 1.36.0 ([#2254](https://github.com/raycast/extensions/pull/2254))
- Moved some subtitles to Raycast List Component accessories prop ([#2254](https://github.com/raycast/extensions/pull/2254))

## [Bug fix for EC2 Instances & UX improvement for SQS command] - 2022-05-23

- Manage the case where there is no public ip in EC2 ([#1715](https://github.com/raycast/extensions/pull/1715))
- Loading indicators for queues attributes ([#1716](https://github.com/raycast/extensions/pull/1716))

## [DynamoDB tables command] - 2022-05-10

Added DynamoDB tables ([#1606](https://github.com/raycast/extensions/pull/1606))

## [Improvement] - 2022-04-07

Added AWS Profile preferences ([#1410](https://github.com/raycast/extensions/pull/1410))

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
