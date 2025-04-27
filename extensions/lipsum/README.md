# lipsum

![extension-icon](./assets/extension-icon.png)

A Raycast extension for generating dummy text in both Japanese and English. 
Easily generate text with a specified character count and copy it to your clipboard.

## Features

- Generate dummy text in both Japanese and English
- Specify the number of characters
- Copy to clipboard
- Streamline your design and development prototyping work

## Screencast

https://github.com/user-attachments/assets/44d32225-05a9-4084-905c-04456b2d8ded

## Development

```bash
# Clone this repository
git clone https://github.com/raycast/extensions.git && cd extensions/lipsum

# Install dependencies
npm install

# Link the extension to Raycast
npm run dev

# Publish
npm run publish
```

## Usage

1. Launch Raycast (default: `⌘Space`)
2. Type "lipsum"
3. Select the language and character count for the text you want to generate
4. The generated text will be automatically copied to your clipboard

## Options

| Option | Description |
|--------|-------------|
| Language | Select Japanese or English |
| Character Count | Specify the number of characters to generate |

## License

Released under the MIT License. 

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request
