# AI Recipes

Create and manage reusable AI recipes with custom prompts - save once, use forever. Inspired by [Spiral](https://spiral.computer).

## Features

### 🎯 Core Features

- **Recipe Management**: Create, edit, duplicate, and delete AI recipes
- **Single Transform Mode**: Each recipe receives input, processes it through preset system prompts, and outputs structured content
- **Reusable Workflows**: Saved recipes can be used repeatedly with consistent output style

### 🏷️ Organization

- **Tag System**: Organize recipes with customizable tags
- **Filter by Tags**: Quickly filter recipes by tag
- **Search**: Search recipes by name and description

### ⚡ User Experience

- **Additional Requirements**: Add temporary supplementary requirements when using recipes, without modifying core prompts
- **Plain Text Output**: Output is not rendered as Markdown for easy copying
- **One-Click Copy**: Quickly copy generated results
- **Usage History**: View and manage history for each recipe

### 📝 Version Control

- **Prompt History**: Automatically saves version history of prompts
- **Version Rollback**: Revert to previous prompt versions

## Commands

| Command | Description |
|---------|-------------|
| Browse Recipes | Browse and use your AI recipes |
| Create Recipe | Create a new AI recipe |
| Manage Tags | Manage recipe tags |

## Recipe Configuration

Each recipe includes the following settings:

- **Name**: The recipe's name
- **Description**: A brief description of the recipe
- **System Prompt**: The AI's core instruction
- **Creativity**: Controls the creativity level of the output
- **Tags**: Tags for categorization
- **Input/Output Type**: Describes the input and output types

## Usage Examples

### Tweet Generator

Convert ideas into engaging tweets:

```
System Prompt:
You are a professional social media content creator. Convert the user's ideas or content into an engaging tweet.

Requirements:
- Keep it concise, under 280 characters
- Use vivid and interesting language
- Add appropriate emojis for expressiveness
```

### Code Explainer

Explain code snippets:

```
System Prompt:
You are a senior programmer. Explain the user's code snippet in clear and concise language.

Requirements:
- Explain the functionality and logic of the code
- Point out key design patterns or algorithms
- Provide improvement suggestions if applicable
```

## Requirements

- Raycast Pro subscription (for AI features)

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` for development mode, or `npm run build` to build
4. Add the extension to Raycast
