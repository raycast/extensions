# Anki AI - Raycast Extension

![Anki AI Logo](./icon.png)

## Introduction

Anki AI is a Raycast extension that allows you to create flashcards for Anki using artificial intelligence. This tool integrates the power of Anki, one of the most popular spaced repetition software for memorization, with Raycast's fast and efficient interface.

Transform texts into personalized study cards quickly and efficiently, leveraging the power of AI to generate relevant questions and answers. Ideal for students, professionals, and anyone interested in optimizing their learning process through flashcards.

## Prerequisites

To use the Anki AI extension, you'll need:

- [Anki](https://apps.ankiweb.net/) installed on your computer
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin installed in Anki
- Anki must be open while you use the extension

### AnkiConnect Setup

1. Open Anki
2. Go to Tools > Add-ons > Get Add-ons
3. Paste the code `2055492159` and click OK
4. Restart Anki after installation
5. Verify that AnkiConnect is working correctly by accessing `http://localhost:8765` in your browser (it should show a message related to AnkiConnect)

## Detailed Feature Description

The Anki AI extension offers several features to make your flashcard creation process more efficient:

### AI-Powered Flashcard Generation
- Transform any text into high-quality flashcards using artificial intelligence
- Advanced algorithms identify important concepts and create relevant questions
- Customize the number of flashcards generated for each text

### Multiple Language Support
- Compatible with English, Portuguese, and Spanish
- Interface adapted to different languages
- Content generation respecting linguistic particularities

### Customization and Configuration
- Configure specific Anki decks and models
- Customize AI prompts according to your study needs
- Control over the format and style of generated flashcards

### Additional Features
- Automatic tag generation for better organization
- Preview and edit flashcards before exporting
- Enhance existing flashcards with AI suggestions
- Seamless integration with Raycast workflow

## Step-by-Step Installation Instructions

Follow these steps to install and configure the Anki AI extension:

1. Install Raycast from the [official website](https://raycast.com/)
2. Install Anki from the [official website](https://apps.ankiweb.net/)
3. Open Anki and install the AnkiConnect plugin:
   - In Anki, go to Tools > Add-ons > Get Add-ons
   - Paste the code `2055492159` and click OK
   - Restart Anki
4. Install the Anki AI extension in the Raycast Store:
   - Open Raycast
   - Press `⌘` + `,` to open preferences
   - Navigate to the "Extensions" tab
   - Click on "Store"
   - Search for "Anki AI" and install

### Initial Configuration

After installation, configure the extension:
1. Open Raycast and type "Anki AI Settings"
2. Configure your basic preferences (language, AI model, default deck)
3. Verify the connection with Anki using the "Test Connection" option

## Configuration Options

The Anki AI extension offers a comprehensive set of configuration options to meet your specific needs.

### Basic Settings

- **Default Language**: Choose between English, Portuguese, or Spanish for flashcard generation. This setting affects both the interface and the language of the generated flashcards.

- **AI Model**: Select the AI model for flashcard generation. More advanced models generally produce higher quality flashcards but may be slower.

- **Default Deck**: Name of the default Anki deck for export. You can specify any existing deck or the extension will create a new deck if the specified one doesn't exist.

- **AnkiConnect Port**: Port for connecting to AnkiConnect (default: 8765). Only change this if you've modified the default AnkiConnect port.

### Advanced Settings

- **Minimum Flashcards**: Minimum number of flashcards to be generated per text (recommended value: 3-5). Defines the lower limit for automatic generation.

- **Maximum Flashcards**: Maximum number of flashcards to be generated per text (recommended value: 10-20). Defines the upper limit to avoid generating excessive flashcards.

- **Enable Tags**: When enabled, the AI will automatically generate tags for flashcards based on the content of the text. This facilitates organization and retrieval of cards in Anki.

- **Custom Prompt Template**: Customize the prompt sent to the AI, allowing you to adjust the type and style of generated flashcards. Example:
  ```
  Generate [NUMBER] flashcards in question/answer format about the following text, focusing on the main concepts:
  [TEXT]
  ```

- **Debug Mode**: Enables detailed logs for troubleshooting. Useful when you're experiencing issues with the extension.

## Screenshots and Visual Guides

_Note: Images will be added in a future update_

### Main Screen
Here the main interface of the extension will be displayed, showing the text input field and action buttons.

### Generation Process
This capture will show the flashcard generation process in progress.

### Flashcard Review
Image of the review and editing screen for flashcards before exporting to Anki.

### Settings
Capture of the extension settings screen.

## Usage Section

### Basic Workflow

1. Open Anki on your computer
2. Open Raycast and type "Generate Flashcards"
3. Paste the text you want to transform into flashcards
4. Click on "Generate Flashcards"
5. Review the generated flashcards
6. Select the flashcards you want to export
7. Click on "Export to Anki"

### Available Commands

- `Generate Flashcards`: Opens the main interface for flashcard generation
- `Anki AI Settings`: Accesses the extension settings
- `Enhance Flashcard`: Allows you to improve an existing flashcard using AI
- `Flashcard History`: View previously generated flashcards

### Usage Examples

**Scientific Article Study**
1. Copy an abstract or important section
2. Generate flashcards focused on methodology and results
3. Export to a specific deck for spaced repetition

**Language Learning**
1. Paste a text in the language you're learning
2. Configure the template to focus on vocabulary or grammar
3. Review and export to your language deck

**Exam Review**
1. Insert your class notes
2. Adjust the maximum number of flashcards to a higher number
3. Organize with specific tags by subject

## Troubleshooting Section

### Common Problems and Solutions

- **Anki connection error**: 
  - Check if Anki is open and the AnkiConnect plugin is installed
  - Confirm that the configured port (default: 8765) matches AnkiConnect's
  - Try restarting both Anki and Raycast
  - Check if there are firewalls blocking the local connection

- **No flashcards generated**: 
  - Try with a longer or more specific text
  - Check if the selected AI model is available
  - Increase the minimum number of flashcards in the settings
  - Try texts with more structured or educational content

- **Low quality flashcards**: 
  - Try adjusting the custom prompt template
  - Use a more advanced AI model
  - Provide texts with clearer and more defined concepts
  - Manually edit the flashcards before exporting

- **Slow generation**:
  - Very long texts may take longer to process
  - Reduce the maximum number of flashcards in the settings
  - Check your internet connection
  - Try a faster AI model (although possibly less advanced)

### Logs and Diagnostics

If you continue to experience problems:
1. Enable Debug Mode in the settings
2. Reproduce the problem
3. Access the logs at: `~/Library/Logs/Raycast/Extensions/anki-ai.log`
4. Contact support providing these logs

## Contribution

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT
