# Logos Search Changelog

## [Unreleased]

- Added a Logos Tools Launcher command that autocompletes Logos tools (Atlas, Text Comparison, Study Assistant, Sermon Builder, Copy Bible Verses, Advanced Timeline, Systematic Theologies, interactives, etc.) and opens them with multiple URI fallbacks.
- Added a Reading Plans command that lists every Logos plan and opens today's assignment via its deep link.
- Added an Open Logos Layout command that filters saved layouts and loads the selected workspace immediately.
- Reading plans and layouts now read directly from `ReadingPlan/ReadingPlan.db` and `LayoutManager/layouts.db`, so the commands work out of the box on current Logos installs (Logos/Verbum, any account folder).
- Added a Bible Word Study command that streams lemmas/senses from Logos' AutoComplete database, then fires Logos' `bws …` command (with multiple URI fallbacks) so the correct study opens every time.
- Added an Exegetical Guide command that accepts Bible passages and launches `My Exegetical Guide` via ref.ly with multiple Logos URI fallbacks. Bible references are parsed locally so entries such as `Matthew 5:1-12` become `ref=BibleESV.Mt5.1-12` by default (customize the prefix in settings).
## [0.1.0] - 2025-11-13

- Added "Open Verse in Logos" command with version aliases and ref.ly opening.
- Added "Search Library" command that indexes Logos catalog.db and opens resources.
