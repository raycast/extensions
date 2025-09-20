# IPA Translator

Converts text to IPA (International Phonetic Alphabet). It supports English, German, Danish, Swedish, and Czech.
Includes actions to copy the translated text or the original text.

![Image](media/ipa-translator-1.png)
![Image](media/ipa-translator-4.png)

## Development

### Adding New Dictionaries

Here are the steps to add a new dictionary (assuming you have a dictionary (txt) to add):

- Place your dictionary.txt in the `original-data` directory and rename it to match the following format: `LANGCODE_dictionary.txt`.
- Add a new command to `package.json`. Again, keep consistency so it looks like all the other commands.
  This is how it would look:

  ```json
  {
    // This line references the file you're going to make in two steps.
    "name": "LANGUAGE-to-ipa",
    "title": "Translate LANGUAGE to IPA",
    "description": "Convert LANGUAGE to international phonetic alphabet.",
    "mode": "view"
  }
  ```

- Add your language to the `Languages` enum in `src/types.ts`.
- Create a tsx file with the name set in `package.json`. Ideally copy one of the
  other languages' file and  modify the `language` prop sent to the `<CustomForm>` component.
- Add a case with your language in the language switch statement in `src/form.tsx`.
- Add your new language to the top of this file amongst all the other languages.
- Test that the command exists and works!
