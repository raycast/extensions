# Pokédex Changelog

## [Shiny Forms] - 2026-02-21

- Added *Shiny* configuration support for Pokémon sprites and artwork.
- Improved Pokémon form handling: pixel expands all forms, official applies filtering.
- Fixed Pokémon form type handling for multi-form species such as #773 (Silvally).

## [ItemDex] - 2026-02-18

- Added **Items** command to browse and filter Pokémon items by pocket, with detailed item information and multi-language support.
- Improved consistency of Pokémon image rendering across all components.
- Disabled **Weaknesses** command by default since weakness information is already available in Pokémon profile and form details.

## [Type Mastery] - 2026-02-13

- Added **Natures** command to explore stat changes and localized names for all Pokémon natures.
- Added **Type Chart** command for a comprehensive overview of type effectiveness, strengths, and weaknesses.
- Fixed **Weakness & Resistance** calculations using a reliable manual cross-reference to avoid missing GraphQL data.
- Completed a global prefix refactor by removing legacy `pokemon_v2_` naming across UI, types, and API queries.
- Fully migrated **Moves** and **Abilities** commands to use GraphQL API data as the single source of truth.

## [Move Stability] - 2026-01-04

- Fixed extension crash occurring when Pokémon move names are missing in localized languages.

## [Windows Support] - 2025-12-04

- Added Windows support; migrate ESLint to flat config and TS to ES2023.
- Upgraded to the latest dependencies for improved security and stability.

## [Attackdex] - 2024-09-28

- Refactored and incorporated additional Move information from PokéAPI, providing more comprehensive details about Pokémon moves.
- Refactored the caching mechanism for improved reusability and efficiency.

## [Enhanced Pokédex Experience] - 2024-09-21

- Implemented caching for faster load times and reduced API usage.
- Added sorting options to organize the Pokédex by Pokémon name or National Pokédex number.
- Introduced a new preference to select your preferred artwork style for Pokémon.
- Provided full Pokémon names in supported languages.
- Leveraged real-time data from PokéAPI for accurate type effectiveness information.

## [Pokédex Mastery] - 2024-09-17

- Added **Weaknesses** command for easy reference.
- Expanded Pokémon details with Shapes, Type Effectiveness, and Encounter Locations.
- Reorganized Pokémon Forms for better information presentation.
- Updated Type Symbols to match Gen 9 designs.
- Refined the overall visual aesthetics for a more pleasing and intuitive user interface.

## [Learnset Perfection] - 2024-05-17

- Fixed a coding issue with the Learnsets action.

## [Paldea Pioneers] - 2024-02-27

- Expanded the Pokédex to include all 1025 Pokémon species, including those from the Paldea region.

## [Scarlet & Violet] - 2023-02-03

- Added additional Gen 9 Pokémon from the Scarlet & Violet games, bringing the total to 1008 Pokémon.

## [Grid Mastery] - 2022-06-16

- Introduced a new Grid layout for a more visually appealing and efficient experience.
- Utilized new list item metadata to enhance information presentation.

## [Type & View] - 2022-03-12

- Implemented type filter and split view for Moves to enable flexible browsing and comparison.
- Enhanced visual clarity by replacing icons with scalable SVG graphics for improved UI precision.
- Added release changelog to keep users informed of new features and updates.

## [Moves & Abilities] - 2022-03-10

- Added **Moves** and **Abilities** commands to browse and filter Pokémon moves and abilities with comprehensive details.
- Added a preference to display previews for enhanced browsing experience.
- Implemented Pokémon type filter for targeted searches.
- Fixed Evolution chains to display accurate lineage information.

## [Pokémon Master] - 2022-03-02

- Added 898 Pokémon Species, including all alternate forms (Alolan, Galarian, Mega Evolution, Gigantamax).
- Enhanced Pokémon details with Training, Breeding, and Forms information.
- Incorporated Pokémon type icons for visual representation.
- Provided Pokémon details in multiple languages.
- Fixed the extension icon for a more polished appearance.

## [Dex Debut] - 2022-02-18

- Launched the initial version of the Pokédex extension with basic Pokémon information and search capabilities.
