# Jan AI Assistant Changelog

## [Initial Version] - 2026-01-14

### Added

- **Process with Jan.ai** - Interactive text processing with AI-powered quick actions (summarize, improve writing, fix grammar, make professional, explain)
- **Jan.ai Quick Actions** - Fast clipboard-based actions for common text transformations
- **Create Reminder from Text** - Intelligent reminder creation with natural language parsing
  - Bills and invoice tracking with amount extraction
  - Due date extraction supporting relative and absolute dates
  - Recurring reminder support (daily, weekly, monthly, yearly)
  - Automatic categorization as [BILL] or [INVOICE]
- **Convert Reminders to CSV** - Parse reminders text and export to CSV format
  - Automatic expense/income categorization
  - Smart date and amount parsing
  - Ready for Excel/Google Sheets import
- PDF text extraction support using pdfplumber
- OCR support for image-based PDFs using Tesseract
- Integration with Apple Reminders app
- Customizable Jan.ai API settings (URL, API key, model, temperature, max tokens)

### Technical Details

- Built with TypeScript and React
- Uses @raycast/api v1.65.0
- Requires Python 3 with pdfplumber, pytesseract, and Pillow
- Optional dependencies: Tesseract OCR and Poppler for PDF OCR support
- 100% vibe-coded with Claude Code
