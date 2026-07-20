# Testing Guide

Quick guide to test the TikZ extension with your BasicTeX installation.

## Prerequisites Check

Verify your LaTeX installation:

```bash
# Check pdflatex is available
pdflatex --version

# Check standalone package is installed
kpsewhich standalone.cls

# Check TikZ is available
kpsewhich tikz.sty
```

All three commands should return output. If not, install missing packages:

```bash
sudo tlmgr install standalone tikz pgf
```

## Test Cases

### Test 1: Simple Circle (Just TikZ Code)

**Input:**
```
\draw (0,0) circle (2);
```

**Expected:** PDF with a circle, radius 2cm

### Test 2: Complete LaTeX Document

**Input:**
```
\documentclass{standalone}
\usepackage{tikz}
\begin{document}
\begin{tikzpicture}
    \draw (0,0) circle (2);
\end{tikzpicture}
\end{document}
```

**Expected:** PDF with a circle (tool should strip document structure)

### Test 3: Multiple Shapes

**Input:**
```
\draw[fill=blue!20] (0,0) rectangle (2,2);
\draw[fill=red!20] (3,1) circle (1);
```

**Expected:** PDF with a blue rectangle and red circle

### Test 4: Simple Graph

**Input:**
```
\node[circle,draw] (a) at (0,0) {A};
\node[circle,draw] (b) at (2,0) {B};
\node[circle,draw] (c) at (1,2) {C};
\draw[->] (a) -- (b);
\draw[->] (b) -- (c);
\draw[->] (c) -- (a);
```

**Expected:** PDF with three nodes connected in a triangle

### Test 5: Flowchart

**Input:**
```
\node[rectangle,draw] (start) at (0,0) {Start};
\node[rectangle,draw] (process) at (0,-2) {Process};
\node[rectangle,draw] (end) at (0,-4) {End};
\draw[->,thick] (start) -- (process);
\draw[->,thick] (process) -- (end);
```

**Expected:** PDF with simple vertical flowchart

## Manual Testing Steps

### Using the AI Tool

1. Open Raycast AI (Cmd+Space, type "Raycast AI")
2. Type: "Draw a simple circle using TikZ"
3. Wait for confirmation dialog
4. Click "Confirm"
5. Check that success toast appears
6. Verify file path is returned
7. Open the file path to view PDF

### Using the Manual Command

1. Open Raycast (Cmd+Space)
2. Type "Create TikZ"
3. Paste one of the test cases above
4. Enter a filename (optional): "test-circle"
5. Check "Open PDF after generation"
6. Press Cmd+Enter to submit
7. Verify PDF opens automatically

## Troubleshooting Tests

### Test: Missing Package Error

**Setup:** Temporarily remove a package
```bash
# Don't actually do this, just for testing error handling
```

**Expected:** Clear error message about missing package

### Test: Invalid TikZ Syntax

**Input:**
```
\draw (0,0) missing semicolon
```

**Expected:** Error message about compilation failure

### Test: Empty Input

**Input:**
```

```

**Expected:** Validation error "TikZ code is required"

## Verifying Output

After each test, check:

1. **File exists:**
   ```bash
   # For AI tool
   ls ~/Library/Application\ Support/com.raycast.macos/extensions/tikz/tikz-diagrams/
   
   # For manual command
   ls ~/Documents/TikZ-Diagrams/
   ```

2. **PDF is valid:**
   ```bash
   file <path-to-pdf>
   # Should say "PDF document"
   ```

3. **PDF opens:**
   ```bash
   open <path-to-pdf>
   ```

## Performance Benchmarks

Expected compilation times:
- Simple shapes: < 2 seconds
- Complex diagrams: 2-4 seconds
- Very complex: 5-8 seconds

## Common Issues

### Issue: "pdflatex not found"
**Solution:** Add to PATH:
```bash
export PATH="/Library/TeX/texbin:$PATH"
```

### Issue: "standalone.cls not found"
**Solution:**
```bash
sudo tlmgr install standalone
```

### Issue: Double-wrapped document
**Solution:** This should be fixed automatically now. The tool strips document structure.

### Issue: PDF created but shows error
**Solution:** This is normal - pdflatex sometimes exits with error code even on success. If PDF exists, it's considered successful.

## Success Criteria

✅ All test cases generate PDFs
✅ PDFs open correctly
✅ Diagrams look correct
✅ Both AI and manual commands work
✅ Error messages are helpful
✅ Confirmation dialog appears
✅ Success toasts appear

## Quick Smoke Test

**Fastest way to verify everything works:**

1. Open Raycast
2. Type "Create TikZ"
3. Paste: `\draw (0,0) circle (1cm);`
4. Submit
5. PDF should open with a circle

If this works, everything is set up correctly! 🎉