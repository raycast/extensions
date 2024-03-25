# RayVops

Optimize your workflow with this Raycast extension, designed to streamline tasks like manipulating JSON structures, modifying string values, and opening numerous links simultaneously.

## Commands Overview

### Concatenate IDs

- **Command**: `Concatenate Ids`
- **Description**: Concatenates a list of String into a single one formatted for SOQL queries.
- **Example**: Input: `123 456 789` becomes `('123', '456', '789')`.

### Extract JSON Field Values

- **Command**: `Extract Json Field Value`
- **Description**: Extracts all values for a specific field from a JSON structure copied to your clipboard.
- **Example**: Given a JSON with IDs `1234` and `5678`, selecting the `Id` field copies `1234 5678` to your clipboard.

### Open Multiple Links

- **Command**: `Open Multiple links`
- **Description**: Takes a list of strings and opens several links in the browser based on these values.
- **Example**: Input: `123 456` opens `https://test.com/123` and `https://test.com/456`.

### Modify and Filter JSON Values

- **Command**: `Modify and Filter JSON values`
- **Description**: Allows modification of a JSON structure from your clipboard. You can replace values for an attribute and filter out only needed fields.
- **Example**: Modifying the `Status` field of multiple records from `Open` to `Closed` and filtering out unneeded fields.


## Contributing

Feel free to contribute to this extension by submitting issues or pull requests with enhancements or fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
