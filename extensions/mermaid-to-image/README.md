# Mermaid to Image

A Raycast extension that instantly converts Mermaid diagram code from your clipboard into beautiful images.

## Features

- **Instant Conversion**: Copy Mermaid code and run the extension to immediately generate an image
- **Multiple Formats**: Generate diagrams in PNG or SVG format
- **Theme Options**: Choose from Default, Forest, Dark, or Neutral themes
- **Easy Sharing**: Copy the generated image directly to your clipboard
- **Custom Save Location**: Save images to your preferred directory

## Installation

1. Make sure you have Node.js installed on your system
2. Install the required Mermaid CLI tool globally by running:
3. Install the extension from Raycast Store
```
npm install -g @mermaid-js/mermaid-cli
```
## Requirements

- [Node.js](https://nodejs.org/) (v14 or higher)
- [@mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli) (must be installed globally using ⁠npm install -g @mermaid-js/mermaid-cli)

## Usage

1. **Prepare Mermaid Code**: 
   - **Option 1**: Select text containing Mermaid diagram code in any application
   - **Option 2**: Copy Mermaid diagram code to your clipboard
   
   Example:
   ```
   graph TD
       A[Start] --> B{Is it working?}
       B -->|Yes| C[Great!]
       B -->|No| D[Debug]
       D --> B
   ```

2. **Run the Extension**: Open Raycast and run "Mermaid to Image"

3. **View and Share**: The extension will automatically generate an image from your selected text or clipboard content (selected text takes priority)

4. **Available Actions**:
   - **Copy Image** (⌘⇧C): Copy the generated image to your clipboard
   - **Save Image** (⌘S): Save the image to your specified location
   - **Open in Default App** (⌘O): Open the image in your default image viewer

## Preferences

Configure the extension in Raycast preferences:

- **Output Format**: Choose between PNG or SVG format
- **Theme**: Select from Default, Forest, Dark, or Neutral themes
- **Save Path**: Specify a custom directory for saving images (defaults to Downloads folder)

## Examples

Here are some example Mermaid diagrams you can try:

### Flowchart
```
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
```

### Sequence Diagram
```
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
```

### Class Diagram
```
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }
```

## Troubleshooting

- **Empty Clipboard**: Make sure you've copied valid Mermaid code before running the extension
- **Node.js Not Found**: Ensure Node.js is installed and in your PATH
- **Memory Issues**: For complex diagrams, the extension automatically allocates more memory

## Credits

This extension uses:
- [@mermaid-js/mermaid-cli](https://github.com/mermaid-js/mermaid-cli) for command-line generation

## License

MIT

---

Made with ❤️ for Raycast