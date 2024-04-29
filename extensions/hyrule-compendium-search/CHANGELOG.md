# Hyrule Compendium Changelog

## [0.3 | Icons Everywhere!] - 2024-04-26

#### New Features:
- Added icons for `category` and all `drops` for entries that have them. Icons are taken from the [Zelda Wiki sprite sheet](https://zeldawiki.wiki/wiki/Category:Breath_of_the_Wild_Sprites).

#### Bug Fixes:
- Fixed bug where if the `drops` property for an entry is `null` instead of an empty array, it no longer throws an error.

#### Roadmap:
- Add icons for `special effects` and `hearts recovered` so that they dont look so boring and are easier to recognize
- Add a new command named **Broad Search** _(name due to change)_ that allows you to perform a broader search and view all the results, instead of just the first one, which is the current behavior of the **Get Entry** command.

## [0.2 | Fixed materials and creatures bug] - 2023-12-03

Fixed certain materials and creatures that had either 0 hearts recovered or no cooking effect displaying the 0 or "" cooking effect. They now dont display their respective empty Details

## [0.1 | Added Hyrule Compendium] - 2023-12-03

Initial version code