# 🏦 Fake Financial Data Generator 🏦

This repository contains a simple menu bar created using Raycast to generate fake financial data, including IBAN, SWIFT/BIC, and account numbers. The code uses the `ibankit` library to generate a random IBAN number, and custom functions to generate fake SWIFT/BIC and account numbers. The generated data can be easily copied to the clipboard by clicking on the menu items.

## Usage

To use this script, you will need to have Raycast installed on your machine. Once Raycast is installed, follow these steps:

1.  Clone the repository to your local machine.
2.  Navigate to the cloned repository and run `npm install && npm run dev` to install the required dependencies and start the development server.
3.  Click on the "Generate Financial Data" icon in the menu bar to reveal the available options for generating fake financial data.
4.  Click on the desired option to generate the fake data, which will automatically be copied to your clipboard.

## Valid Commands

The following commands are available to generate fake financial data:

### Generate IBAN

This command generates a random IBAN number using the `ibankit` library. Clicking on this command will copy the generated IBAN number to your clipboard.

### Generate SWIFT/BIC

This command generates a fake SWIFT/BIC code using a custom function. Clicking on this command will copy the generated SWIFT/BIC code to your clipboard.

### Generate Account Number

This command generates a fake account number using a custom function. Clicking on this command will copy the generated account number to your clipboard.
