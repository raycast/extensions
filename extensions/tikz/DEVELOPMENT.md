# Development Guide

## Architecture

This extension consists of two main components:

### 1. AI Tool (`src/tools/generate-tikz-diagram.ts`)

The AI tool allows Raycast AI to generate TikZ diagrams programmatically during conversations.

**Key Features:**
- Type-safe input validation using TypeScript interfaces
- Confirmation dialog before execution
- Automatic LaTeX document generation
- PDF compilation using `pdflatex`
- File path return for AI reference

**Input Parameters:**
- `tikzCode` (required): The TikZ code to compile
- `fileName` (optional): Custom name for the output file

**Output:**
- Returns the absolute file path to the generated PDF

**Process Flow:**
1. Receive TikZ code from AI
2. Show confirmation dialog to user
3. Create output directory if needed
4. Generate complete LaTeX document with TikZ preamble
5. Write `.tex` file
6. Compile with `pdflatex`
7. Return PDF file path

### 2. Manual Command (`src/create-tikz.tsx`)

A form-based interface for manually creating TikZ diagrams.

**Features:**
- React-based form interface
- Real-time validation
- Optional auto-open generated PDF
- Custom file naming
- User-friendly error messages

**Components:**
- `Form.TextArea`: For entering TikZ code
- `Form.TextField`: For custom file naming
- `Form.Checkbox`: To toggle auto-open behavior
- `ActionPanel`: Submit action

## File Structure

```
tikz/
├── src/
│   ├── create-tikz.tsx              # Manual creation command
│   └── tools/
│       └── generate-tikz-diagram.ts # AI tool implementation
├── examples/
│   └── tikz-examples.md             # Example TikZ code snippets
├── package.json                      # Extension manifest and dependencies
└── README.md                         # User documentation
```

## LaTeX Document Template

Both components use the same LaTeX template:

```latex
\documentclass[border=2pt]{standalone}
\usepackage{tikz}
\usetikzlibrary{arrows,automata,positioning,shapes,calc,decorations.pathreplacing,decorations.markings,patterns}

\begin{document}
\begin{tikzpicture}
<USER_TIKZ_CODE_HERE>
\end{tikzpicture}
\end{document}
```

**Why `standalone` class?**
- Crops output to diagram size
- No page margins
- Perfect for embedding

**Included Libraries:**
- `arrows`: Various arrow styles
- `automata`: State machines
- `positioning`: Advanced positioning
- `shapes`: Geometric shapes
- `calc`: Coordinate calculations
- `decorations.*`: Path decorations
- `patterns`: Fill patterns

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install LaTeX:**
   ```bash
   brew install --cask mactex
   # or for minimal install:
   brew install --cask basictex
   sudo tlmgr install standalone tikz pgf
   ```

3. **Start development mode:**
   ```bash
   npm run dev
   ```

4. **Build extension:**
   ```bash
   npm run build
   ```

## Testing

### Manual Testing

1. **Test AI Tool:**
   - Open Raycast AI chat
   - Ask: "Generate a TikZ diagram with a circle and a square"
   - Verify confirmation dialog appears
   - Confirm and check PDF is generated
   - Verify file path is returned

2. **Test Manual Command:**
   - Open Raycast
   - Search for "Create TikZ"
   - Paste example TikZ code
   - Submit and verify PDF opens

### Test Cases

#### Valid TikZ Code
```tikz
\draw (0,0) circle (1cm);
\node at (0,0) {Test};
```
**Expected:** PDF generated successfully

#### Invalid TikZ Code
```tikz
\draw (0,0) invalid command;
```
**Expected:** Error message about compilation failure

#### Empty Input
```tikz

```
**Expected:** Validation error

#### Complex Diagram
```tikz
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (2,0) {B};
\draw[->] (a) -- (b);
```
**Expected:** PDF with graph

## Error Handling

### LaTeX Not Installed
```
Error: Failed to compile TikZ diagram. Make sure pdflatex is installed...
```
**Solution:** Install MacTeX or BasicTeX

### Invalid TikZ Syntax
```
Error: Failed to compile TikZ diagram...
```
**Solution:** Check TikZ code for syntax errors

### Permission Issues
```
Error: EACCES: permission denied...
```
**Solution:** Check output directory permissions

## Output Locations

- **AI Tool:** `~/Library/Application Support/com.raycast.macos/extensions/tikz/tikz-diagrams/`
- **Manual Command:** `~/Documents/TikZ-Diagrams/`

Why different locations?
- AI tool uses Raycast's support path for internal data
- Manual command uses Documents for user accessibility

## Adding New Features

### Adding TikZ Libraries

Edit the LaTeX template in both files:

```typescript
const latexDocument = `\\documentclass[border=2pt]{standalone}
\\usepackage{tikz}
\\usetikzlibrary{arrows,automata,...,NEW_LIBRARY}
...`;
```

### Adding Input Parameters

1. Update the `Input` type:
```typescript
type Input = {
  tikzCode: string;
  fileName?: string;
  newParam?: string; // Add new parameter
};
```

2. Update confirmation:
```typescript
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Generate diagram with ${input.newParam}?`,
    info: [
      // Add info about new parameter
    ],
  };
};
```

3. Use in main function

### Adding Output Formats

To support formats beyond PDF (e.g., PNG, SVG):

1. Install ImageMagick:
   ```bash
   brew install imagemagick
   ```

2. Convert PDF to PNG:
   ```typescript
   execSync(`convert -density 300 "${pdfFilePath}" "${pngFilePath}"`);
   ```

## Best Practices

### TypeScript
- Always define input types explicitly
- Use async/await for file operations
- Handle errors with try/catch
- Provide descriptive error messages

### User Experience
- Show progress toasts for long operations
- Provide confirmation for destructive actions
- Give clear feedback on success/failure
- Include helpful error messages with solutions

### File Management
- Use unique timestamps in filenames
- Create directories if they don't exist
- Clean up temporary files if needed
- Use proper path joining

### LaTeX
- Always set `border` in standalone class
- Include commonly used TikZ libraries
- Use `standalone` for cropped output
- Compile with `-interaction=nonstopmode`

## Debugging

### Enable Verbose Logging

Add console logs:
```typescript
console.log("TikZ code:", input.tikzCode);
console.log("Output path:", pdfFilePath);
```

View logs in Raycast Developer Console (Cmd+Shift+D in dev mode).

### Test LaTeX Compilation Manually

```bash
cd ~/Documents/TikZ-Diagrams
pdflatex -interaction=nonstopmode diagram.tex
```

Check `.log` file for detailed errors.

### Common Issues

**Issue:** PDF not generated but no error
- Check `.log` file in output directory
- Verify all TikZ libraries are installed

**Issue:** Path not returned to AI
- Ensure function returns string
- Check for thrown errors

**Issue:** Confirmation not showing
- Verify confirmation function is exported
- Check input types match

## Performance

- Compilation typically takes 1-3 seconds
- File size: ~10-50 KB for simple diagrams
- Memory usage: Minimal (LaTeX runs as subprocess)

## Security

- User input is not executed directly
- LaTeX code is sandboxed
- Output files use timestamp-based names (no collisions)
- File paths are validated

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## Useful Resources

- [TikZ Documentation](https://tikz.dev/)
- [Raycast API Docs](https://developers.raycast.com/api-reference)
- [TikZ Examples](http://www.texample.net/tikz/)
- [LaTeX Standalone Class](https://ctan.org/pkg/standalone)