# Case Converter Application

The Case Converter application is a utility tool that allows users to convert input strings between different case formats. It supports various case types, such as camelCase, kebab-case, PascalCase, snake_case, dot.case, CONSTANT_CASE, and path/case.

## How to Use

1. Enter your input string in the search bar provided.

2. As you type, the application will automatically generate and display the converted results in the different case formats.

3. The "Results" section will show the converted strings along with their corresponding case types.

4. If you want to copy any converted string to the clipboard, you can do so by clicking the "Copy" action button next to the result. You can also use the keyboard shortcut "Cmd + ." (Command + Period) to quickly copy the content.

## Supported Case Formats

The Case Converter application currently supports the following case formats:

- camelCase: This format has the first word in lowercase and subsequent words capitalized, with no spaces or special characters.

- kebab-case: Words are separated by hyphens ("-") and are all lowercase.

- PascalCase: Similar to camelCase, but the first word is capitalized.

- snake_case: Words are separated by underscores ("_") and are all lowercase.

- dot.case: Words are separated by periods (".") and are all lowercase.

- CONSTANT_CASE: All letters are in uppercase, and words are separated by underscores.

- path/case: Words are separated by slashes ("/") and are all lowercase.

## Implementation Details

The application is built using React and the Raycast API. It uses a mapping mechanism to convert the input string to various case formats. The `handlers` object contains functions for each case type, and the `Mapper` type defines the mapping between case types and their corresponding conversion functions.

When you enter an input string, the application dynamically applies all the case conversion functions and generates the converted results. The results are displayed in the "Results" section along with their respective case types.

The application also provides a convenient way to copy any converted string to the clipboard, enabling easy use of the converted content in other contexts.

## Contributions

If you find any bugs or have suggestions for improvement, feel free to contribute to the project. You can submit issues or pull requests to the project repository.

Thank you for using the Case Converter application! Happy converting! 🚀