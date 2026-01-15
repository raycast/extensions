# Jan AI Assistant

A comprehensive Raycast extension for Jan.ai that provides text processing, quick actions, and intelligent reminder creation.

> **100% vibe-coded with [Claude Code](https://claude.com/claude-code)**
> MIT Licensed • Built with AI assistance

## Features

### 1. Process with Jan.ai
Interactive text processing with multiple quick actions:
- **Summarize** - Create concise summaries
- **Improve Writing** - Enhance clarity and flow
- **Fix Grammar** - Correct errors and typos
- **Make Professional** - Convert to business language
- **Explain** - Simplify complex concepts

### 2. Jan.ai Quick Actions
Fast clipboard-based actions:
- Summarize, improve, fix grammar
- Make professional or casual
- Expand or shorten text
- Explain concepts
- Translate to Spanish
- Convert to bullet points

### 3. Create Reminder from Text
Intelligent reminder creation with special support for bills and invoices:
- **Natural language parsing** - "Call dentist tomorrow"
- **Invoice & bill tracking** - "Electric bill $150 due Jan 15"
- **Due date extraction** - Supports relative and absolute dates
- **Recurring reminders** - Daily, weekly, monthly, yearly
- **Amount tracking** - Extracts and stores dollar amounts

### 4. Create Reminder from PDF
Process PDF invoices and bills with intelligent extraction:
- **Direct invoice processing** - Upload or paste PDF files
- **Clipboard support** - Copy PDF in Finder (⌘C), then paste (⌘V)
- **Vision & OCR fallback** - Works with both text and image-based PDFs
- **Accounts receivable/payable** - Automatic sign detection
- **Split payment terms** - Handles "50% down, 50% NET 30" scenarios
- **Smart date parsing** - Explicit dates, relative dates, NET terms

### 5. Process PDF with Jan.ai
Versatile PDF processing with multiple actions:
- **Extract Tasks** - Pull invoice data and create reminders
- **Summarize** - Generate concise PDF summaries
- **Custom Prompt** - Ask any question about PDF content
- **Multi-file support** - Process multiple PDFs at once
- **Clipboard integration** - Copy files in Finder and paste

### 6. Convert Reminders to CSV ⚠️ Work in Progress
Parse reminders and convert to CSV table for spreadsheet import:
- **Automatic categorization** - Separates expenses from income
- **Smart date parsing** - Handles multiple date formats
- **Amount extraction** - Pulls dollar amounts automatically
- **CSV export** - Ready to paste into Excel/Google Sheets
- **Dual tables** - EXPENSES (negative) and INCOME (positive) separated

**Note:** This feature is currently under development and may not work as expected.

## Prerequisites

### Required Software

1. **Jan.ai** running locally with API server enabled
2. **Apple Reminders** app (for reminder creation)
3. **Python 3** with the following packages:
   ```bash
   pip3 install pdfplumber pytesseract Pillow
   ```

### Optional: PDF OCR Support

For OCR processing of image-based PDFs (invoices, scanned documents):

1. **Tesseract OCR** - Install via Homebrew:
   ```bash
   brew install tesseract
   ```

2. **Poppler** (for pdftoppm utility) - Install via Homebrew:
   ```bash
   brew install poppler
   ```

**Note:** PDF text extraction will work without OCR for text-based PDFs using pdfplumber. OCR is only needed for scanned/image-based PDFs.

### Jan.ai Model

Download a model in Jan.ai (e.g., llama-3.1-8b-instruct, mistral-7b-instruct)

## Installation

```bash
git clone <repository>
cd jan-ai-assistant
npm install
npm run dev
```

## Configuration

In Raycast preferences for this extension:

- **Jan.ai API URL**: Default `http://localhost:1337/v1/chat/completions`
- **API Key**: Your Jan.ai API key
- **Default Model**: Model name (e.g., `llama-3.1-8b-instruct`)
- **Temperature**: 0.0-1.0 (default: 0.7)
- **Max Tokens**: Maximum response length (default: 2000)
- **Reminder List Name**: Apple Reminders list (default: "To Do")

## Usage

### Process with Jan.ai

1. Copy text to clipboard or provide as argument
2. Run "Process with Jan.ai" command
3. Select action from menu
4. View result and copy/paste as needed

### Quick Actions

1. Copy text to clipboard
2. Run "Jan.ai Quick Actions" command
3. Select desired action
4. Result is automatically copied to clipboard

### Create Reminder

Run "Create Reminder from Text" with examples like:

**Simple tasks:**
```
Call dentist tomorrow
Buy groceries on Friday
```

**Bills with amounts:**
```
Electric bill $150 due January 15th
Internet $89.99 due next week
```

**Recurring bills:**
```
Monthly rent $2000 due on the 1st
Weekly gym class every Monday
```

**Invoices:**
```
Client invoice $5000 due next Friday
Quarterly tax payment $3500 due March 15
```

### Create Reminder from PDF

Process PDF invoices directly:

1. **Via Clipboard:**
   - Copy PDF file in Finder (⌘C)
   - Run "Create Reminder from PDF" command
   - Press ⌘V to paste from clipboard
   - Reminders created automatically

2. **Via File Picker:**
   - Run "Create Reminder from PDF" command
   - Select PDF file from picker
   - Submit to process

**Supported invoice formats:**
- Text-based PDFs (instant extraction)
- Scanned/image PDFs (uses OCR)
- Split payment terms ("50% down, 50% NET 30")
- Both accounts receivable (money you receive) and payable (money you pay)

### Process PDF with Jan.ai

Versatile PDF processing with multiple actions:

1. **Extract Tasks:**
   - Same as "Create Reminder from PDF"
   - Supports multiple PDFs at once

2. **Summarize:**
   - Select PDF(s) and choose "Summarize PDF" action
   - Summary copied to clipboard and shown in viewer
   - Useful for quick document review

3. **Custom Prompt:**
   - Select PDF(s) and choose "Custom Prompt" action
   - Enter your question (e.g., "What are the payment terms?")
   - Result copied to clipboard and shown in viewer

**Example custom prompts:**
```
Extract all line items with prices
List all vendor contact information
What are the warranty terms?
Translate this document to Spanish
```

## How Reminders Work

1. Text is sent to Jan.ai for structured extraction
2. Jan.ai returns JSON with:
   - Title
   - Amount (if applicable)
   - Due date
   - Recurrence pattern
   - Bill/Invoice classification
3. Extension creates reminder in Apple Reminders with:
   - Task title
   - Amount in notes (formatted as "$150.00")
   - Due date
   - [BILL] or [INVOICE] tag
   - Recurrence information

## Supported Date Formats

- **Relative**: "tomorrow", "next week", "in 3 days"
- **Absolute**: "Jan 15", "January 15th", "2025-01-15"
- **Day names**: "Monday", "next Friday"

## Supported Repeat Intervals

- `daily`
- `weekly`
- `monthly`
- `yearly`

## Troubleshooting

### "Cannot connect to Jan.ai"
- Ensure Jan.ai is running
- Enable API server in Jan.ai settings
- Verify API URL in preferences

### "Missing authorization header"
- Set your Jan.ai API key in preferences
- Verify the key is correct

### Model errors
- Check installed models in Jan.ai
- Use exact model ID (case-sensitive)
- Verify model is downloaded and active

### Reminder creation fails
- Ensure "To Do" list exists in Apple Reminders
- Extension will create list if missing
- Check Reminders app permissions

### PDF processing fails
- **"pdfplumber not installed"**: Run `pip3 install pdfplumber`
- **"pytesseract not found"**: Run `pip3 install pytesseract`
- **"pdftoppm not found"**: Run `brew install poppler`
- **"tesseract not found"**: Run `brew install tesseract`
- **"image input is not supported"**: Model doesn't support vision, will auto-fallback to OCR
- **Sandboxed file paths**: Extension automatically copies to temp directory

## Project Structure

```
jan-ai-assistant/
├── src/
│   ├── process-text.tsx                    # Text processing command
│   ├── quick-actions.tsx                   # Quick actions command
│   ├── create-reminder.tsx                 # Text reminder creation
│   ├── create-reminder-from-pdf-direct.tsx # PDF invoice reminders
│   ├── process-pdf-native.tsx              # Multi-purpose PDF processing
│   ├── reminders-to-csv.tsx                # CSV export (WIP)
│   └── utils/
│       ├── janApi.ts                       # Jan.ai API integration
│       ├── reminderUtils.ts                # Apple Reminders integration
│       ├── pdfUtils.ts                     # PDF text extraction & OCR
│       ├── imageUtils.ts                   # Image OCR support
│       ├── textHelpers.ts                  # Text formatting utilities
│       └── types.ts                        # TypeScript types
├── package.json                            # Dependencies & config
├── tsconfig.json                           # TypeScript config
└── README.md                               # Documentation
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Tips

1. **Better date parsing**: Be specific - "Jan 15" works better than "next month"
2. **Amount extraction**: Include currency symbols - "$150" or "€50"
3. **Categorization**: Use keywords like "bill", "invoice", "recurring" for better results
4. **Model selection**: Larger models give better extraction but are slower

## Getting Your Model Name

```bash
curl http://localhost:1337/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Common model IDs:
- `llama-3.1-8b-instruct`
- `mistral-7b-instruct-v0.2`
- `phi-2`

## License

MIT License

Copyright (c) 2026 Mike Derham

This extension was 100% vibe-coded with [Claude Code](https://claude.com/claude-code).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
