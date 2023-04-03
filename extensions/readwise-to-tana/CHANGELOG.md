# Readwise to Tana Changelog

## [Add URL mapping for highlights] - 2023-03-15

- Add field mapping for highlight URLs

## [Fix ordering, clean titles, and handle line breaks] - 2023-03-06

- Reverse order of highlights. This will display and copy them in the order they were added, instead of displaying the latest highlight first.
- Handle unparsed apostrophes in titles, for example "What&#39;s" -> "What's".
- Handle notes that include a line break.

## [Add new highlight fields and author supertag] - 2023-02-14

- Add more field mappings for highlight tagging: Updated At, Highlighted At, and Color
- Add ability to set supertag on author

## [Filtering and new fields] - 2023-02-14

- Add filtering by category to library view
- Add field mappings for Title, URL, and Readwise URL to template

## [Initial Version] - 2023-02-09

- List books
- List highlight with details from each book
- Copy individual notes
- Copy all notes with super tags in Tana's paste format
- Store which notes have already been copied
- Use custom templates using Handlebars
