# Word Search for Raycast

<img width="200" src="assets/command-icon.png">


Search for synonyms, antonyms, spellings, adjectives, rhymes, and words with missing letters using Raycast!

## How to search using Word Search
Once you've entered your text, just hit `return` on your keyboard to insert it in the foremost as well as copy it to your clipboard.

## How to search for Words With Missing Letters
![missing letters](media/6-missing.png)

To search for missing letters, place `?` between the letters you are unsure about.
For example, in the picture above, `s??a?t` means search for a word, 6 characters in length, where we don't know 3 of the letters in **those** positions where the `?` is.

Likewise, if you enter `he??o`, it will show all the combination of five-letter words with `he` in the beginning and `o` at the end.

If you use `*` instead of `?`, it will search for words with any number of missing letters. For example, `*he*o` will show all the words with `he` in the middle and `o` at the end.

*But no cheating in Wordle!*

## Deeplinks

> Pro-tip: if you want to search for a word directly, you can use [deeplinks](https://manual.raycast.com/deeplinks)

- Right-click on the command and select "Copy Deeplink"
- Add an optional query parameter `?fallbackText=your-text-here` to search for a word directly

## Word Search in Action

![synonym](media/1-synonym.png)

![synonym](media/2-spell.png)

![adjective](media/3-adjective.png)

![antonym](media/4-antonym.png)

![rhyme](media/5-rhyme.png)
