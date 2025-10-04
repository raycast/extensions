# Translate JSON

A Raycast extension that intelligently translates selected text. If the text is valid JSON, it translates only the values while preserving keys. Otherwise, it translates the entire text.

## Features

- **Smart Detection**: Automatically detects if selected text is JSON
- **JSON Translation**: Translates only values, keeping all keys intact
- **Plain Text Translation**: Translates full text if not JSON
- **17 Languages**: Support for Spanish, Danish, Dutch, Swedish, French, German, Portuguese, Chinese, Russian, Japanese, Korean, Arabic, Hindi, Italian, Polish, Turkish, and Vietnamese
- **Auto Paste**: Automatically pastes the translated result

## Usage

1. Select any text (JSON or plain text)
2. Run the "Translate JSON" command
3. Choose your target language
4. The translated result is automatically copied and pasted

## Example

**Input JSON:**
```json
{
  "greeting": "Hello",
  "message": "Welcome to our app"
}
```

**Output (Spanish):**
```json
{
  "greeting": "Hola",
  "message": "Bienvenido a nuestra aplicación"
}
```

## Credits

Translation functionality inspired by [Translator](https://github.com/johnjofin07/Translator) by johnjofin07.

## License

MIT
