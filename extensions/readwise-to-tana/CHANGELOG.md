# Readwise to Tana Changelog

## [Update default template and supertags on notes] - 2023-05-31

- Update default template with title and notes
- Add the ability to set supertags on nested notes

## [Add supertags depending on source category, highlight tags, reset sync of one source] - 2023-04-12

- Add the ability to set different supertags for articles, books, podcasts, supplementals, and tweets
- Display and export highlight tags
- Reset synchronization history of a specific source

- Fix: Handle unparsed apostrophes in titles when copying, for example "What&#39;s" -> "What's"
- Fix: Multiline notes should be handled better and remove the unnecessary extra "Note:" child
- Fix: We only fetched the first 100 highlights, so if you had more, they weren't included in the copy. To ensure all highlights are captured, fetch up to 1000 (Readwise's max page size)

- **Important:** Re-save your current template to include the new template features

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
