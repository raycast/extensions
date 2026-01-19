# BNF Search Tool

A fast, efficient Raycast extension designed for nurses, students, and healthcare professionals. It allows you to search the **British National Formulary (BNF)** and **BNFC (Children's Formulary)** directly from your keyboard.

## Features

- **Dual Formulary Support:** Seamlessly toggle between **BNF (Adults)** and **BNFC (Children)** using a simple dropdown menu.
- **Smart Direct Search:**
  - Intelligently checks if a direct drug monograph exists (e.g., searching "Paracetamol" takes you straight to the specific page).
  - If a direct page is not found (e.g., for a condition like "Acne" or a typo), it automatically falls back to the standard search results page.
- **Fast & Lightweight:** Uses a "Head" request to verify links instantly without downloading full pages.
- **Privacy Focused:** No patient data is entered or stored; it is purely a reference search tool.

## How to Use

1.  Open Raycast and search for **BNF**.
2.  **Select Source:**
    - Default is **BNF (Adults)**.
    - Select **BNFC (Children)** from the dropdown if needed.
3.  **Enter Search Term:** Type a medication name (e.g., `Amoxicillin`) or a clinical topic.
4.  **Submit:** Press `Cmd + Enter` to open the browser.

## Technical Details

This extension uses the Raycast API and `node-fetch`. It constructs a potential URL based on the user's input (converting "Bowel Cancer" to `bowel-cancer`) and sends a `HEAD` request to the NICE website.

- **If status 200 (OK):** Opens the direct URL.
- **If status 404 (Not Found):** Opens the query search URL.

## Author

**Jack Smith** (Student Nurse)

## License

MIT
