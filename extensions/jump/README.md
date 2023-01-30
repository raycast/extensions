# Jump

Jump to websites, folders, or files

## Available Commands:

- Jump To Destination
  - Quickly access a file, folder, application, or URL
  - Use abbreviations to jump efficiently (e.g. j google.com --> j go)
  - Destinations are weighted such that the more you jump to something, the easier you can jump to it (by using shorter abbreviations)
  - Pre-loaded with common destinations such as Google.com
- Copy Jump Data
  - Copies a JSON representation of saved destinations and associated weights to the clipboard
- Import Jump Data
  - Imports a JSON string containing destinations and weights

## How It Works

When you provide _Jump_ with the abbreviated form of some destination, it compares your input to its stored destinations and identifies the full destination path or URL which best matches that abbreviation, then it opens, or _jumps to_, that destination. The matching logic is based on several factors, including the overall character similarity between your input and each full destination, the length of the longest consecutive sequence of matching characters, the average length of matching sequences of characters, and the overall number of jumps you've previously made to each destination.

_Jump_ comes pre-configured with common destinations such as Google, YouTube, Reddit, StackOverflow, many default macOS applications, and directories such as Documents and Downloads. To add a new destination, you have to provide enough specificity such that your target destination doesn't get confused for an existing one; for example, to add Google Keep to the list of possible destinations, you will need to specify the full URL ([http://keep.google.com](http://keep.google.com)) since shorter forms will closely match existing destination targets. _Jump_ is generally good at jumping to files, folders, and applications with unique names, however you may need to specify a more exact path in some circumstances.

After you've added a destination, you can begin using abbreviated forms to jump to them. Keeping with the previous example, after adding Google Keep, you can use `Jump to Destination [keep]` or `j [keep]` to jump there. Each time you make the same jump, its weight increases in calculations for subsequent jumps. Thus, over time, you'll be able to use shorter abbreviated for commonly jumped-to destinations.

## Examples

All of the following can* jump to google.com:
- `Jump To Destination [https://google.com]`
- `Jump To [google.com]`
- `Jump [goog]`
- `j [go]`

All of the following can* jump to Calculator.app:
- `Jump To Destination [/System/Applications/Calculator.app]`
- `Jump To [Calculator.app]`
- `Jump [calc]`
- `j [c]`

All of the following can* jump to the user's Downloads folder:
- `Jump To Destination [/Users/exampleUser/Downloads]`
- `Jump To [~/Downloads]`
- `Jump [downl]`
- `j [d]`

\* = The actual destination resulting from shorthand abbreviations depends on the associated weights; as users use Jump more, their abbreviations become more specialized to their usage habits.