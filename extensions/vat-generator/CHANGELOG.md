# VAT Generator Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Generate checksum-valid test VAT numbers for 30 European countries
- Full EU coverage (27 member states) plus United Kingdom, Andorra, and Serbia
- United States EIN generator (format-valid with IRS prefix rules; no checksum)
- Switzerland and Norway (non-EU, EU-style VAT prefixes with checksum)
- VAT country code prefix shown as a tag for every country in the list
- Removed non-European countries from the catalog
- Search countries by name or VAT prefix
- Copy, paste, regenerate, and refresh-all actions
