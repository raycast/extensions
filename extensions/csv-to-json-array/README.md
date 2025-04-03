# CSV to JSON Array

This Raycast extension converts CSV files to JSON format with robust error handling. The script processes selected CSV files from Finder and transforms them into structured JSON documents while maintaining data types.

## Features

- **Batch Processing**: Convert multiple CSV files in parallel
- **Type Detection**: Automatically detects and converts data types (numbers, booleans, dates, null values)
- **Proper CSV Parsing**: Handles quoted fields and escaped quotes according to CSV standards
- **Robust Error Handling**: Validates input files, provides clear error messages, and ensures resources are properly closed
- **User Feedback**: Displays conversion status and results through Raycast HUD

## Technical Details

The script implements a CSV parser that correctly handles:
- Fields with commas inside quoted values
- Escaped quotes within quoted fields (using double quotes)
- Empty fields and null values
- Automatic type conversion for common data types

The error handling system validates files before processing, ensures output directories are writable, and properly manages all file streams. The script uses a structured approach to collect and report errors, providing meaningful feedback to users.

## Usage

1. Select one or more CSV files in Finder
2. Run the extension from Raycast
3. The script will process the files and convert them to JSON
4. A status message will display the conversion results

Each JSON file will be created in the same location as its corresponding CSV file, with the same filename but a `.json` extension.