# Spiceblow

Spiceblow is a Raycast extension that simplifies Sql database management for PostgreSQL and MySQL. It acts as a bridge between you and your data, allowing you to interact with your database using natural language queries. By leveraging AI, Spiceblow translates your everyday language into Sql, making it easier to search, update, and analyze your data without writing complex queries. It's like TablePlus but built into Racyast and super fast to navigate thanks to the full keyboard support Raycast provides.

## Features

- Supports PostgreSQL and MySQL databases
- Filter database rows with natural language search, using AI to generate the Sql query
- Search rows by any column or all searchable columns
- Save custom Sql queries with full support for filtering
- Generate custom Sql queries using AI
- Generate stacked bar graphs of your data
- Update, delete and duplicate your database rows
- Run transactions to group multiple queries, for example to switch emails of 2 users

## Security

Your databases connection string is stored locally in the Raycast encrypted storage, this connection string is never sent over the network, it is only used to connect to the database locally.

The extension can generate Sql filters based on natural text, this feature depends on a backend service, the server does not have access to the database connection string, only the database schema is sent to the service to be able to generate the SQL query.

All the data returned by the server cannot update or delete any data in the database, all the queries returned by the server are run in a read only session to prevent any destructive update to the database.

Any update, insertion and deletion to the database is presented to the user with a markdown view of the Sql code before running, the user has to explicitly agree to run the query.

## Credits & Payment

This extension requires a license to be used fully, some free credits are available to try the extension, after these free requests are used you will be prompted to buy a license.

Currently the license is priced at $59.

## Why Google login is required

This extension uses a Google token to identify the user, this token is used to connect a bought license to the user after the payment with Stripe via webhooks.

## Real world usage

I use Spiceblow every day to update and manage my projects databases, for example for [Spiceblow itself](https://spiceblow.com) Postgres database, for [Unchatgpt](https://antidetection.com) Postgres database and [Notaku](https//notaku.so) Mysql database.

Some of the most common tasks:

- Handling support tickets, find the user projects, settings, etc
- Updating users emails
- Manually updating user settings without having to write SQL or use an admin panel
- Find users that signed up this week
- Draw a graph of the last month sign-ups
- Export rows as CSV to then run scripts on them
