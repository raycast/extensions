# arXiv Changelog


## [Added viewing formats, publication year, and citation export] - 2025-09-09

- Added multiple viewing formats: Abstract, PDF, TeX Source, and HTML
- Added citation export in multiple formats: BibTeX, APA, MLA, and Chicago
- Added preferences for default open format and citation style
- Enhanced search results with additional metadata (DOI, publication year, journal references, comments)
- Added quick actions to copy various paper links
- Added tooltip showing full author list when hovering over abbreviated authors
- Enhanced title tooltip to show full citation in selected style, followed by category codes
- Added documentation explaining arXiv category codes in README
- Added publication venue display in search results (shows journal names and conference venues as colored tags)
- Added intelligent conference extraction from paper comments (detects NeurIPS, ICML, CVPR, etc.)
- Added page count display from paper comments
- Improved accessory layout for cleaner, more consistent appearance
- Added preference to toggle between "Time Since Published" and "Publication Details" display modes
  - Time Since Published: Shows only the time ago (default)
  - Publication Details: Shows venue and/or page count; blank if neither available
- Improved data parsing to extract all available arXiv metadata
- Added comprehensive unit tests for citation formatting, XML parsing, and components

## [Fix] - 2023-11-24

- Optimized import to reduce build size

## [🎉 Initial Version] - 2023-05-31

Initial version code.
