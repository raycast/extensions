# LaTeX OCR

Capture a screenshot of any math formula and instantly copy its LaTeX code to your clipboard.

## Prerequisites

1. **Python 3** - Make sure you have Python 3 installed:
   ```bash
   python3 --version
   ```

2. **pipx** - Install pipx if you don't have it:
   ```bash
   brew install pipx
   pipx ensurepath
   ```

3. **pix2tex** - Install the LaTeX OCR engine:
   ```bash
   pipx install pix2tex
   ```
   
   > ⚠️ First run will download ~500MB model. Run `pix2tex` once in terminal to warm up.

## Usage

1. Open Raycast and search for **"Capture LaTeX"**
2. Select the area containing the math formula
3. Wait for recognition (a few seconds)
4. LaTeX code is automatically copied to your clipboard ✅

## Example

