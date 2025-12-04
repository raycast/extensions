# Hyrule Compendium Changelog

<!-- ---------------------------------------------------------------- -->

## [Release **v1.0** | Introducing Broad Search!]

#### New Features:
- Added the **`Broad Search`** command [🎉](raycast://extensions/raycast/raycast/confetti). It allows you to see a grid with the multiple results of your search instead of only the first one, which is what `Get Entry` does.
- Added [icons](https://zeldawiki.wiki/wiki/Category:Breath_of_the_Wild_Sprites) for `Special Effects` in `Materials` and `Creatures`.
- Added [icons](https://zeldawiki.wiki/wiki/Category:Breath_of_the_Wild_Sprites) for the `Hearts Recovered` property in `Materials` and `Creatures` depending on the ammount of hearts recovered (also removed the text saying how many hearts).
- Added Icons for weapon `Attack` and shield `Guard`

#### Bug Fixes:
- Changed the icon for the Treasure Chest that said *Treasures*, it used to be the same icon as the `Treasures` catergory but is now a monochrome rupee.
- Changed the icon for the Blupee that said *Rupees*, it used to be the green rupee icon but is now a monochrome rupee.
- Changed the style of the entry description to now be standard markdown text instead of a code block.

<!-- ---------------------------------------------------------------- -->

## [v0.3 | Icons Everywhere!] - 2024-04-26

#### New Features:
- Added icons for `category` and all `drops` for entries that have them. Icons are taken from the [Zelda Wiki sprite sheet](https://zeldawiki.wiki/wiki/Category:Breath_of_the_Wild_Sprites).

#### Bug Fixes:
- Fixed bug where if the `drops` property for an entry is `null` instead of an empty array, it no longer throws an error.

<!-- ---------------------------------------------------------------- -->

## [v0.2 | Fixed materials and creatures bug] - 2023-12-03

Fixed certain materials and creatures that had either 0 hearts recovered or no cooking effect displaying the 0 or "" cooking effect. They now dont display their respective empty Details

<!-- ---------------------------------------------------------------- -->

## [v0.1 | Added Hyrule Compendium] - 2023-12-03

Initial version code