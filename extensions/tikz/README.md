# TikZ Diagram Generator for Raycast

Convert TikZ code to beautiful diagrams that can be shown in AI chat or created manually through a form interface.

## Features

- 🤖 **AI Tool Integration**: Generate TikZ diagrams directly from Raycast AI chat
- 📝 **Manual Creation**: Create diagrams using a user-friendly form interface
- 🎨 **Full TikZ Support**: Supports all TikZ libraries and features
- 📄 **PDF Output**: Generates high-quality PDF diagrams
- 🚀 **Fast Compilation**: Uses pdflatex for quick diagram generation

## Prerequisites

You need to have LaTeX installed with the TikZ package. On macOS, you can install either:

**Option 1: MacTeX (Full, ~4GB)**
```bash
brew install --cask mactex
```

**Option 2: BasicTeX (Minimal, ~100MB) - Recommended**
```bash
brew install --cask basictex
```

After installing BasicTeX, add it to your PATH and install required packages:
```bash
# Add to PATH (add this to your ~/.zshrc or ~/.bash_profile)
export PATH="/Library/TeX/texbin:$PATH"

# Reload your shell or run:
source ~/.zshrc

# Install required packages
sudo tlmgr update --self
sudo tlmgr install standalone tikz pgf
```

**Verify Installation:**
```bash
pdflatex --version
kpsewhich standalone.cls  # Should return a path
```

## Usage

### How It Works with Raycast AI

When you ask Raycast AI to create a TikZ diagram:

1. **AI generates TikZ code** based on your request
2. **Tool confirmation appears** - Review and confirm the diagram generation
3. **Tool compiles** the TikZ code to PDF using `pdflatex`
4. **Path is returned** - The absolute file path to the generated PDF
5. **Raycast uploads** the file and may display it inline (if supported)

**Important Notes:**
- The tool returns a **file path**, not a URL
- Raycast AI should handle uploading/displaying the file
- If you see Gemini generating its own diagram instead, it means the tool failed (check logs)
- PDFs are saved to: `~/Library/Application Support/com.raycast.macos/extensions/tikz/tikz-diagrams/`

### AI Tool

The AI can use the `Generate TikZ Diagram` tool to create diagrams during a conversation. Simply describe what you want to draw, and the AI will generate the appropriate TikZ code and compile it.

**Example AI prompts:**
- "Draw a simple circle with a radius of 2cm"
- "Create a flowchart with 3 nodes connected by arrows"
- "Generate a binary tree with depth 3"
- "Draw a coordinate system with a sine wave"

The tool will:
1. Ask for confirmation before generating
2. Compile the TikZ code to PDF
3. Return the file path to the generated diagram

### Manual Command

Use the `Create TikZ` command to manually create diagrams:

1. Open Raycast and search for "Create TikZ"
2. Enter your TikZ code (without the `\begin{tikzpicture}` wrapper)
3. Optionally provide a file name
4. Choose whether to open the PDF after generation
5. Submit to generate your diagram

**Example TikZ Code:**

```latex
\draw (0,0) circle (1cm);
\draw (0,0) -- (1,1);
\node at (0,-1.5) {My Circle};
```

```latex
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (2,0) {B};
\node[circle,draw] (c) at (1,-1.5) {C};
\draw[->] (a) -- (b);
\draw[->] (b) -- (c);
\draw[->] (c) -- (a);
```

```latex
\draw[->] (-3,0) -- (3,0) node[right] {$x$};
\draw[->] (0,-2) -- (0,2) node[above] {$y$};
\draw[domain=-3:3,smooth,variable=\x,blue] plot ({\x},{sin(\x r)});
```

## Output Location

- **AI Tool**: Diagrams are saved to `~/Library/Application Support/com.raycast.macos/extensions/tikz/tikz-diagrams/`
- **Manual Command**: Diagrams are saved to `~/Documents/TikZ-Diagrams/`

## Tool Configuration

The tool automatically includes commonly used TikZ libraries:
- `arrows` - Arrow tips and styles
- `automata` - State diagrams and automata
- `positioning` - Advanced node positioning
- `shapes` - Various geometric shapes
- `calc` - Coordinate calculations
- `decorations.pathreplacing` - Path decorations
- `decorations.markings` - Path markings
- `patterns` - Fill patterns

## Troubleshooting

### LaTeX not found

If you get an error about `pdflatex` not being found:

1. Install MacTeX or BasicTeX (see Prerequisites)
2. Make sure `/Library/TeX/texbin` is in your PATH:
   ```bash
   echo $PATH | grep texbin
   ```
   If not found, add to your `~/.zshrc`:
   ```bash
   export PATH="/Library/TeX/texbin:$PATH"
   ```
3. Restart your terminal and Raycast
4. Verify with: `which pdflatex`

### Tool returns path but AI doesn't show diagram

If the tool succeeds but Gemini generates its own diagram instead:

1. **Check the returned path** in the AI logs - it should be an absolute path like:
   ```
   /Users/.../Library/Application Support/.../tikz-diagrams/diagram_123456.pdf
   ```

2. **Verify the PDF exists**:
   ```bash
   ls -lh ~/Library/Application\ Support/com.raycast.macos/extensions/tikz/tikz-diagrams/
   ```

3. **Open it manually** to verify it's correct:
   ```bash
   open ~/Library/Application\ Support/com.raycast.macos/extensions/tikz/tikz-diagrams/diagram_*.pdf
   ```

4. **If PDF is correct but not displayed**: This is a Raycast AI limitation. The tool is working correctly, but the AI may choose to generate its own diagram instead of using the file.

### "Failed to compile TikZ diagram" error

If you get this error even though pdflatex is installed:

**If you passed a complete LaTeX document:**
The tool now automatically handles this! You can pass either:
- Just TikZ commands: `\draw (0,0) circle (2);`
- A complete document with `\documentclass`, `\usepackage`, etc.

The tool will automatically strip the document structure and add its own wrapper.

**If the error persists:**
1. Check the generated `.log` file in the output directory for detailed errors
2. Verify you have the required packages:
   ```bash
   kpsewhich standalone.cls
   kpsewhich tikz.sty
   ```
3. If packages are missing:
   ```bash
   sudo tlmgr install standalone tikz pgf
   ```
4. Try the quick test from `TESTING.md`:
   ```bash
   cd /tmp
   cat > test.tex << 'EOF'
   \documentclass[border=2pt]{standalone}
   \usepackage{tikz}
   \begin{document}
   \begin{tikzpicture}
   \draw (0,0) circle (2);
   \end{tikzpicture}
   \end{document}
   EOF
   pdflatex test.tex
   open test.pdf
   ```

### Compilation errors

If your TikZ code fails to compile:

1. **Check for missing packages:** If you see "File `standalone.cls' not found":
   ```bash
   sudo tlmgr install standalone
   ```

2. Check your TikZ syntax - make sure commands end with semicolons

3. The tool accepts both:
   - Just TikZ commands: `\draw (0,0) circle (1cm);`
   - Complete LaTeX documents (it will extract the TikZ code automatically)

4. Verify packages are installed:
   ```bash
   kpsewhich standalone.cls
   kpsewhich tikz.sty
   ```

5. Try compiling manually to see detailed errors:
   ```bash
   cd ~/Documents/TikZ-Diagrams
   pdflatex your-file.tex
   cat your-file.log
   ```

### PDF not opening

If the PDF is generated but doesn't open:

1. Check the output directory for the PDF file
2. Manually navigate to the output location
3. Ensure you have a PDF viewer installed

## Examples

### Simple Shapes

```latex
\draw[fill=blue!20] (0,0) rectangle (2,2);
\draw[fill=red!20] (3,0) circle (1);
\draw[fill=green!20] (6,0) -- (7,0) -- (6.5,1.5) -- cycle;
```

### Flowchart

```latex
\node[rectangle,draw] (start) at (0,0) {Start};
\node[rectangle,draw] (process) at (0,-2) {Process};
\node[diamond,draw,aspect=2] (decision) at (0,-4) {Decision?};
\node[rectangle,draw] (end) at (0,-6) {End};
\draw[->] (start) -- (process);
\draw[->] (process) -- (decision);
\draw[->] (decision) -- node[right] {Yes} (end);
\draw[->] (decision) -| node[above] {No} (2,-4) |- (process);
```

### Graph

```latex
\draw[->] (0,0) -- (5,0) node[right] {$x$};
\draw[->] (0,0) -- (0,4) node[above] {$y$};
\draw[domain=0:4.5,smooth,variable=\x,blue,thick] plot ({\x},{0.5*\x*\x});
\node[blue] at (2.5,3.5) {$y = \frac{1}{2}x^2$};
```

## Debugging

### PATH Issues with Raycast Extensions

If you get "Failed to compile TikZ diagram" errors even though `pdflatex` works in your terminal, it's likely a PATH issue.

**The Problem:**
Raycast extensions run in a restricted environment where the PATH doesn't automatically include `/Library/TeX/texbin`. Even though you can run `pdflatex` in your terminal, the extension can't find it.

**The Solution:**
The extension now automatically searches for `pdflatex` in these locations (in order):
1. `/Library/TeX/texbin/pdflatex` (standard MacTeX/BasicTeX location)
2. `/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex`
3. `/usr/local/texlive/2024/bin/universal-darwin/pdflatex`
4. `/usr/local/bin/pdflatex`
5. `/opt/homebrew/bin/pdflatex`
6. Falls back to `which pdflatex` using the system PATH

**To verify pdflatex is found:**
```bash
# Check if pdflatex is executable
test -x /Library/TeX/texbin/pdflatex && echo "Found!"

# Or check with which
which pdflatex
```

**Manual test to verify compilation works:**
```bash
cd ~/Library/Application\ Support/com.raycast.macos/extensions/tikz/tikz-diagrams/
# Find a .tex file that was created
ls -lt *.tex | head -1
# Compile it manually
pdflatex -interaction=nonstopmode <filename>.tex
# Check if PDF was created
ls -lt *.pdf | head -1
```

If manual compilation works but the extension still fails, check the Raycast console logs (Cmd+Shift+D in development mode) for detailed error messages.

## License

MIT

## Author

Visual-Studio-Coder