# Markdown Styler

A Raycast extension that converts Markdown text to styled HTML with inline CSS, ready for direct copy-paste into content editors and platforms.

## Features

- **Inline CSS Styling**: Generates HTML with embedded inline CSS for maximum compatibility
- One-click conversion of Markdown text to styled format
- **Browser-based Preview & Copy**: Interactive HTML preview with one-click copying
- Modern minimalist styling optimized for content platforms
- Support for all common Markdown elements: headings, lists, code blocks, quotes, tables, etc.
- **Custom Styled Output**: Pre-designed CSS optimized for content platforms and editors

## How to Use

1. Select Markdown text in any application
2. Trigger Raycast and run the "Style Markdown" command
3. Click the "Open in Browser and Copy" button
4. Click the "Copy Content" button in the opened browser
5. Paste the formatted content directly into your content editor

## Supported Markdown Elements

- **Headings** (H1-H6) - with custom styling and borders
- **Paragraphs** - with proper spacing and justification
- **Lists** (ordered and unordered) - with custom bullet points
- **Code blocks** - with syntax highlighting background
- **Inline code** - with distinctive background color
- **Blockquotes** - with gradient background and left border
- **Links** - with hover effects
- **Images** - with rounded corners and shadows
- **Tables** - with modern styling and hover effects
- **Bold text** - with enhanced font weight

## Technical Details

This extension uses the `marked` library to parse Markdown and applies custom CSS styling optimized for content platforms' rich text editors. The styling includes:

- Apple system fonts for better readability
- Carefully tuned spacing and line heights
- Modern color scheme with gradients
- Responsive design elements
- Copy-friendly HTML structure

## Security Note

This extension opens a temporary HTML file in your browser to facilitate copying formatted content. The file is automatically cleaned up after use and contains only your converted Markdown content.

## Requirements

- Raycast
- macOS
- Modern web browser (for the copy functionality)

## License

MIT
