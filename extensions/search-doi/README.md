# DOI Search

Searching for academic papers, articles and journals with a Digital Object Identifier (DOI) now natively inside Raycast.

## Features

- **Instant metadata:** View the title, author(s), journal, and publication date. 
- **Abstract Viewer:** Built in is an abstract viewer, allowing a quick look at whether is paper is relevant to your studies (where available).
- **Citation Generator**: Quickly copy references in a few formats (more to follow):
	- **APA 7** Rich text and formatted for pasting into Word, Docs, Pages, OpenOffice
	- **BibTeX** Optimised for LaTeX users
	- **RIS** Works with EndNote, Zotero, Mendeley
	- **CSV** For data exports
	- **Note** Only one reference at a time!
	
## Usage

1. **Search:** Search a DOI (for example., "10.1177/1742715008098308" or "https://doi.org/10.1177/1742715008098308") in the search box
2. **Information Appears!:** Press 'Enter' to view the full abstract (if available) and other metadata
3. **Reference Generator:** Press 'CMD + Shift + R' or click to open the citation menu, allowing for APA, BibTeX, RIS or CSV output.  
4. **Take me to the real thing!:** Press 'CMD + Enter' to navigate to the doi.org site, redirecting you to the paper. 

## Limitations

- **Missing Abstracts:** Some publishers (e.g., Elsevier, The Lancet) do not make abstracts available via the public Crossref API. In these cases, the extension will display a notice explaining why the abstract is missing.
- **Rate Limiting:** The search is throttled slightly while typing to prevent hitting API rate limits.
- **Citations:** I do not guarantee the citations will be correctly formatted or complete all of the time. Please always check with your institution's citations guidelines. 
- **References:** Further to the above, it would be cumbersome to add ALL reference types. APA is in for now, in time I may add more.

## Author

**Jack Smith** (Student Nurse)

## License

MIT