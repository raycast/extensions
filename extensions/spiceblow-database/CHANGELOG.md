# Search Database Changelog

## [Update] - 2025-02-02

- Add support for relations links in row metadata
- Add export JSON action with pagination, can export millions of rows

## [Update] - 2024-12-12

- Add select inputs for enum columns during update
- Fix retry logic for filter AI generation
- Add select feature to bulk delete rows
- Sort rows by creation date desc by default
- Max 3 connections to database, so extension does not extinguish user's connection pool
- Removed table rows counts in first list view because wrong

## [Update] - 2024-11-28

- Add ordering of tables in the first list view, last used elements are first
- Improve graph view, it will show a loading indicator instead of a empty image
- Add copy command to graph view to copy the graph image to clipboard
- Show Mysql blob values as strings
- Better query generation, handle errors by retrying with an agent loop

## [Initial Version] - 2024-10-02
