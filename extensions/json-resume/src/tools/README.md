# Text to Resume Tool

A Raycast AI tool that converts plain text into a validated JSON Resume schema format.

## Overview

This tool uses AI to intelligently parse resume text and convert it into the standardized [JSON Resume](https://jsonresume.org/schema/) format. It includes validation to ensure the generated JSON conforms to the schema.

## Features

- **AI-Powered Conversion**: Uses Claude AI to intelligently extract resume information from unstructured text
- **Schema Validation**: Automatically validates the generated JSON against the official JSON Resume schema
- **User Confirmation**: Asks for confirmation before processing, showing a preview of the text
- **Auto-Save**: Automatically saves validated resumes to your collection
- **Error Handling**: Provides clear error messages if conversion or validation fails

## Usage

The tool is designed to be invoked by Raycast AI. Simply provide:

1. **text** (required): The plain text content of a resume, CV, or bio
2. **title** (optional): A title for the generated resume

### Example Input

```
John Doe
Software Engineer
john@example.com | +1-234-567-8900

SUMMARY
Experienced software engineer with 5+ years in full-stack development.

EXPERIENCE
Senior Developer at Tech Corp (2020-2023)
- Built scalable web applications
- Led team of 5 developers

EDUCATION
Bachelor of Computer Science, MIT, 2018

SKILLS
JavaScript, TypeScript, React, Node.js
```

### Example Output

The tool generates a valid JSON Resume object with structured sections:

```json
{
  "basics": {
    "name": "John Doe",
    "label": "Software Engineer",
    "email": "john@example.com",
    "phone": "+1-234-567-8900",
    "summary": "Experienced software engineer with 5+ years in full-stack development."
  },
  "work": [
    {
      "company": "Tech Corp",
      "position": "Senior Developer",
      "startDate": "2020-01-01",
      "endDate": "2023-12-31",
      "highlights": ["Built scalable web applications", "Led team of 5 developers"]
    }
  ],
  "education": [
    {
      "institution": "MIT",
      "studyType": "Bachelor",
      "area": "Computer Science",
      "endDate": "2018-12-31"
    }
  ],
  "skills": [
    {
      "name": "Programming",
      "keywords": ["JavaScript", "TypeScript", "React", "Node.js"]
    }
  ]
}
```

## Confirmation Dialog

Before processing, the tool shows a confirmation dialog with:

- **Text Preview**: First 200 characters of the input
- **Title**: The specified title or "Untitled Resume"
- **Text Length**: Total character count

## Implementation Details

### Input Type

```typescript
type TextToResumeInput = {
  text: string; // The text content to convert
  title?: string; // Optional title for the resume
};
```

### Confirmation Handler

The `confirmation` function implements `Tool.Confirmation<TextToResumeInput>` and returns:

- A preview of the text to be converted
- The title that will be used
- The length of the input text

### Main Handler

The default export is an async function that:

1. Shows a loading toast
2. Uses AI to convert the text to JSON Resume format
3. Parses and cleans the AI response
4. Validates against the JSON Resume schema
5. Saves the resume to local storage
6. Returns the formatted JSON

## Error Handling

The tool handles various error scenarios:

- **Parse Errors**: If the AI generates invalid JSON
- **Validation Errors**: If the JSON doesn't match the schema (returns JSON with warning)
- **General Errors**: Any other errors during processing

## Dependencies

- `@raycast/api`: For Tool types, AI, and toast notifications
- `../utils/validateResume`: For JSON Resume schema validation
- `../utils/storage`: For saving resumes to local storage
