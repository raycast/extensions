# Amazon AWS Changelog

## [API Gateway, AppSync & Amplify Enhancements] - 2025-08-25

- Add API Gateway command to manage REST and HTTP APIs
  - Browse and search API resources, methods, and integrations
  - View and manage deployment stages and API keys
  - Monitor usage plans and quotas
- Add AppSync command for GraphQL API management
  - View and manage GraphQL schemas, data sources, and resolvers
  - Generate and manage API keys with expiration tracking
  - Quick access to GraphQL endpoint and console
- Add AI-powered tools for AWS Amplify automation
  - Automate project discovery and branch management
  - Streamline webhook operations and build triggers
  - Enhanced job monitoring with intelligent insights
- Add Amplify build log download with improved error handling

## [Amplify command] - 2025-08-11

- Add notification management for AWS Amplify branches
  - Manage build notifications settings
  - Direct link to AWS Console notifications page
  - Visual notification status in branch list with bell icons
- Add custom rules management for redirects and rewrites
  - View and manage redirect and rewrite rules
  - Create custom rules with source patterns and targets
  - Configure HTTP status codes (200, 301, 302, 404)
  - Edit existing rules
  - Delete unwanted rules
  - Direct link to AWS Console rewrites and redirects settings
- Add comprehensive build management and history functionality
  - View full build history for each branch with status indicators
  - Start new builds directly from Raycast
  - Cancel running builds
  - Retry failed builds with original commit details
  - View detailed build information including commit, timestamps, and duration
  - Access build artifacts for completed jobs
  - Color-coded status indicators for quick visual feedback
  - Direct links to AWS Console build logs
- Add monitoring links for AWS Amplify apps and branches
  - App-level monitoring: Access logs, Alarms, Hosting compute logs, Metrics
  - Branch-level monitoring: Build & Deploy logs, Access logs
  - Quick access through dedicated Monitoring submenu
- Add full environment variables management for AWS Amplify apps
  - View all configured environment variables in a searchable list
  - Add new environment variables with validation
  - Edit existing variable values
  - Delete environment variables
  - Copy individual variables or all variables in JSON/.env format
  - Visual indicator shows which apps have environment variables configured
  - Direct link to AWS Console environment variables page
- Add webhook support for AWS Amplify branches
  - Display webhook URLs in branch actions submenu
  - Enable direct webhook triggering to initiate builds
  - Show webhook count indicator in branch accessories
- Fix console link generation for AWS Amplify branches

## [Fix] - 2025-08-08

- Fix missing console link generation for AWS Amplify apps in resourceToConsoleLink utility

## [Amplify command] - 2025-08-07

- Add AWS Amplify command to manage Amplify apps and branches
- View app details including platform, repository, and update times
- Navigate to app branches with auto-build status and deployment information
- Quick actions to open apps/branches in browser and AWS Console

## [Fixes] - 2025-06-18

- Fix local development crashing without AWS Vault.

## [Console command] - 2025-06-13

- Add AWS Audit Manager service to console command
- Fix Amazon Bedrock service details (previously had incorrect AWS Audit Manager information)

## [Console command] - 2025-05-23

- Fix full URLs (e.g. `https://quicksight.aws.amazon.com`) routing correctly to the console

## [Console command] - 2025-04-25

- Update WAF & Shield path to '/wafv2/homev2/home' for WAFv2 migration
- Update AWS Firewall Manager path to '/wafv2/fmsv2/home' for Firewall Manager v2
- Add common abbreviations 'cfn' for CloudFormation and 'sfn' for Step Functions

## [S3 command] - 2025-04-15

- Add "Copy S3 URI" action

## [Secrets command] - 2024-12-06

- Add actions to copy individual secret values [#14582](https://github.com/raycast/extensions/issues/14582)
- Updated the dependencies to get rid of critical security vulnerabilities.

## [Lambda command] - 2024-10-28

- Add an Invoke option which allows to save, update or delete payloads and saves the result in clipboard

## [Glue command] - 2024-10-21

- Add Glue command to list Glue jobs, job runs, job definitions and to trigger a job run [#13316](https://github.com/raycast/extensions/pull/13316)

## [Pipelines, DDB, CFN commands] - 2024-07-29

- Pipelines: Reduced the size per page to reduce throttling: [#13304](https://github.com/raycast/extensions/issues/13304)
- DDB: Handle pagination upfront instead of Raycast pagination. Also, adds frecency sorting.
- DDB: Add item count to accessories and handle mutation during item update/deletion.
- CFN: Handle pagination upfront instead of Raycast pagination. Also, adds frecency sorting.

## [S3 Command] - 2024-07-12

- added reverse order option
- added bucket policy view

## [SQS, Secrets, Pipelines and Logs Commands] - 2024-07-08

- No unnecessary pagination with typeahead for SQS, Secrets and Logs commands. Pagination with typeahead is redundant.
- Added frecency sorting for SQS, Secrets and Logs command results.
- SQS: Reduced max items per search to 25 to reduce throttling, added mutation after sending message and purging.
- Secrets: Removed pre-loading resource policy and instead provided an ad-hoc action. This reduces [throttling](https://github.com/raycast/extensions/issues/13296).
- Pipelines: Changed icons and improved mutation logic.

## [Improvements] - 2024-07-05

- Adds copy option to s3 command

## [Contributor maintenance] - 2024-07-04

- Move @JonathanWbn to list of past contributors

## [Fixes] - 2024-07-03

- Reverts to rendering all pipelines at once. We can add wait later if this causes issues
- Optimized the mutation for pipeline actions even further.
- Reduced AWS calls during initial rendering. Also revalidates the list in pipeline action sub-menus every time it is opened.

## [Improvements] - 2024-07-02

- Changed AwsAction.Console component, to create sso shortcut login links, if possible

## [Fixes] - 2024-06-24

- Fixed [the issue](https://github.com/raycast/extensions/issues/13088) when codepipeline(s) are rendered with no executions.
- Adds mutate optimization for toggling stage transition.

## [Console command] - 2024-06-19

- [Frecency sorting](https://developers.raycast.com/utilities/react-hooks/usefrecencysorting) so that most/recent used service console links appear at the top of search
- Fixed issue where console links were improperly generated: [#13032](https://github.com/raycast/extensions/issues/13032)

## [Improvements] - 2024-06-18

- CodePipeline: Adds action to retry failed stage, stop ongoing execution and toggle stage transition
- Secrets Manager: Retrieves secret value in a new Detail navigation and adds extra metadata
- Cloudformation: Improves the resource switch action

## [Console command] - 2024-06-17

- Adds shortcut login for SSO profiles

## [SQS, CFN, DDB, CW Logs commands] - 2024-06-14

- Native raycast pagination support for DDB, SQS, CFN and CW logs commands
- Typeahead search for SQS and CW logs command
- Extra metadata and new icon for CW logs command

## [Improvements] - 2024-06-06

- Adds sort descending and consistent read functionalities to DDB queries
- Saves the query projection expression in between form renders
- Improved toast error handling for SQS, DDB and CFN command actions

## [DynamoDB command] - 2024-05-30

- Adds UpdateItem, DeleteItem and Query functionalities for the tables
- Adds metadata for the tables in the List view
- Adds Deletion Protection Enablement capability for tables

## [CFN and SQS] - 2024-05-21

- Adds update-termination-protection commands for stacks listed in CFN command ([#12497](https://github.com/raycast/extensions/issues/12497))
- Adds listing exports feature to CFN command
- Additional metadata for the SQS queues mapped into list item details ([#12498](https://github.com/raycast/extensions/issues/12498))
- Adds SendMessage action for queues

## [Improvements] - 2024-05-15

- Fix resource types for Step Function Command Actions ([#12353](https://github.com/raycast/extensions/issues/12353))
- Fix S3 Objects console links
- Fix CodePipeline accessory icon and visual improvements
- Fix CloudFormation stack resources list item key for disambiguation
- Added keys to most list items for disambiguation and copy link action for urls ([#11750](https://github.com/raycast/extensions/issues/11750))

## [ECR] - 2024-04-14

- Added support for navigating AWS ECR repositories

## [S3 folders] - 2024-04-14

- Added support for navigating S3 buckets using folders

## [Step Functions command] - 2024-02-18

- Added new command to find and open Step Functions ([#10801](https://github.com/raycast/extensions/pull/10801))

## [Make Vault Optional] - 2023-11-16

- Make vault optional for people who have it installed but do not want to use it.

## [Fix Broken Secrets Manager Link] - 2023-08-14

- Fix broken region-routing for secrets manager links.

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
