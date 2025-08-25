# Roadmap

This document outlines potential future improvements and alternative implementation approaches for the Raycast arXiv Search extension.

## Feature Enhancements

### Search Improvements
- **Advanced search syntax**: Support for boolean operators, field-specific searches
- **Search history**: Remember recent searches for quick access
- **Saved searches**: Allow users to save frequently used search queries
- **Smart suggestions**: Auto-complete based on popular searches or user history

### Integration Features
- **Zotero integration**: Direct export to Zotero library
- **Reference manager APIs**: Integrate with Mendeley, EndNote, etc.

### UI/UX Improvements
- **Customizable display**: Let users choose which metadata to show in list view
- **Preview pane**: Quick preview of abstract without opening
- **Batch operations**: Select multiple papers for bulk actions

## Citation System Improvements

Consider replacing the current custom citation formatting with [citeproc-js](https://github.com/Juris-M/citeproc-js), a JavaScript implementation of the Citation Style Language (CSL) processor.

**Pros:**
- **Standards-based**: Uses CSL, an established open standard with 10,000+ citation styles available
- **Comprehensive**: Handles complex edge cases like anonymous works, multiple editions, translations, etc.
- **Well-maintained**: Active development with regular updates for new citation style requirements
- **Localization**: Built-in support for multiple languages and locale-specific formatting
- **Battle-tested**: Used by Zotero, Mendeley, and other major reference managers
- **Extensibility**: Easy to add new citation styles by just adding CSL files

**Cons:**
- **Bundle size**: Adds ~300KB to the extension, which may impact Raycast performance
- **Complexity**: Requires learning CSL-JSON format and the citeproc API
- **Over-engineering**: arXiv papers are simpler than the books/journals that CSL is designed for
- **Dependencies**: Would add external dependency vs current zero-dependency approach
- **Integration effort**: Would need to transform arXiv data to CSL-JSON format
- **Runtime overhead**: More processing than current direct string formatting
