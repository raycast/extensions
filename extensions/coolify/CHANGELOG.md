# Coolify Changelog

## [View Environment Variable + Fix DB Deletion] - 2025-06-23

- fix: Unable to delete Databases in `Resources`
- view `Environment Variables` of **applications** and **services**
- update some types to match latest endpoints

## [Delete Resource Action + Support DBs in Resources] - 2025-03-07

- In `Resources` you can _delete_ by also specifying what to delete and if you want to cleanup afterwards (similar to Coolify UI)
- In `Resources` you can now perform `Action` (start, stop, restart) on Databases (Clickhouse, DragonFly, KeyDB, MariaDB, MongoDB, MySQL, PostgreSQL, Redis)

## [Enhancements] - 2025-01-02

- In `Projects`:
    - Create Project
    - Update Project
- In `Private Keys`
    - View Private Keys

## [Enhancements] - 2024-10-23

- Fix issue where `Resources` command would crash if the resource type is not "application" or "service"
- Tweaked UI of `Servers > Resources`
- New `View Projects` command

## [Initial Version] - 2024-09-22

- View Servers
    - View Server Details
    - View Server Resources
- View Teams
    - View Team Members
- View Resources
    - Start Resource
    - Stop Resource
    - Redeploy Resource