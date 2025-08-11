# 4Devs Toolkit - Brazilian Document Generator for Raycast

Generate valid Brazilian documents and test data directly from Raycast. This extension is inspired by the popular Brazilian website [4Devs](https://www.4devs.com.br/), bringing their most useful generators to your Raycast launcher.

## Features

### 🎯 Document Generators
- **CPF Generator**: Generate valid CPF numbers with state-based validation
- **CNPJ Generator**: Create valid CNPJ numbers for company testing
- **CNH Generator**: Generate valid driver's license numbers
- **Certidão Generator**: Create valid birth/marriage certificate numbers (32-digit format)
- **Credit Card Generator**: Generate valid test credit card numbers (Visa, Mastercard, etc.)

### ⚡ Key Capabilities
- **Batch Generation**: Generate up to 50 documents at once
- **Multiple Export Formats**: Export as JSON, CSV, or plain text
- **History Tracking**: Automatically saves generated documents for later use
- **Favorites System**: Mark frequently used documents as favorites
- **Smart Formatting**: Toggle between formatted and unformatted output
- **Portuguese Interface**: Fully localized for Brazilian developers

## Use Cases
- Testing form validations in development
- Populating test databases
- QA testing with valid Brazilian documents
- API testing with realistic data
- Educational purposes and demonstrations

## Note
**This is an UNOFFICIAL extension**, not affiliated with [4Devs](https://www.4devs.com.br/). This project is a tribute to everything they've built for the Brazilian developer community since 2012. All document generation algorithms follow Brazilian standards and validation rules.

## Technical Details
- Built with TypeScript and React
- Uses Raycast API for seamless integration
- Implements official Brazilian validation algorithms (Módulo 11, Luhn algorithm)
- Local storage for history and favorites
- Zero external dependencies beyond Raycast API