# DirectAdmin Reseller Changelog

## [Fix Error When 0 Packages + Add Hooks] - 2024-08-16

- DirectAdmin has introduced a new JSON api and added `json` support to the previous Legacy API. The API is still a WIP but we now have 2 hooks that will help us slowly migrate the endpoints to use the better JSON APIs.
- Fix an issue that would crash `Reseller User Packages` when there are ZERO packages in the account

## [Initial Version] - 2023-11-28