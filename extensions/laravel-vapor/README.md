# Raycast Extension for Laravel Vapor

This extension allows you to quickly access your Laravel Vapor data from Raycast. When searching for a project, database, network, domain or cache, you can select one and Raycast will open that item in your browser in the proper location in the Vapor dashboard.

## Requirements
You must first provide a API token so the extension can access your Vapor data. 

You can generate a token [here](https://vapor.laravel.com/app/account/api-tokens).

Once you have copied your API token, you can set it in Raycast when it prompts you to do so.

## Usage

### Commands

#### Switch Team

With this command you can list all the teams you own and the teams you are a member of. Laravel tracks a `current_team_id` and all of your data is scoped to that team. When using this command you can select a team to set as your current team. Similar to the Laravel Vapor CLI.

All the rest of the commands will be scoped to the current team, either from you selecting a team or from current team id set by Laravel Vapor.


#### List Projects

This command will list all the projects in your current team. 

#### List Databases

This command will list all the databases in your current team.

#### List Networks

This command will list all the networks in your current team.

#### List Domains

This command will list all the domains in your current team.

#### List Caches

This command will list all the caches in your current team.


### Credits
The Vapor logo is from [here](https://github.com/vscode-icons/vscode-icons/blob/master/icons/file_type_vapor.svg)

> To convert the SVG to PNG: `qlmanage -t -s 512 -o . vapor.svg`
