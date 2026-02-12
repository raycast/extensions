# BNF Search Tool

A fast, efficient Raycast extension designed for nurses, students, and healthcare professionals. It allows you to search the **British National Formulary (BNF)** and **BNFC (Children's Formulary)** directly from your keyboard.

At this point, the tool does not search directly for NICE guidelines.

## Features

- **Dual Formulary Support:** Seamlessly toggle between **BNF (Adults)** and **BNFC (Children)** using a simple dropdown menu.
- **Smart Direct Search:**
  - Checks if a direct drug monograph exists (e.g., searching "Paracetamol" takes you straight to the specific page).
  - If a direct drug page is not found (e.g., for a condition like "Acne" or a typo), a search is performed for a treatment summary. For example, "Acne" would bring up this treatment summary, where medications can be found.
  - If there is no drug or treatment summary, the tool will redirect to a BNF search, which could highlight typos or different terminology.
- **Fast & Lightweight:** Uses a "Head" request to verify links instantly without downloading full pages.
- **Medusa Integration:** A quick link is provided for Medusa (sign in required). Search at this point isn't implemented.
- **Privacy Focused:** No patient data is entered or stored; it is purely a reference search tool.


## How to Use BNF Search

1.  Open Raycast and search for **BNF**.
2.  If Medusa IV/IM drug information is required, simply push `Cmd + M`.
3.  **Select Source:**
    - Default is **BNF (Adults)**.
    - Select **BNFC (Children)** from the dropdown if needed.
4.  **Enter Search Term:** Type a medication name (e.g., `Amoxicillin`) or a clinical topic.
5.  **Submit:** Press `Cmd + Enter` to open the browser.
6.  **Treatment Summaries:** You can search the BNF or BNFC for treatment summaries in the same field.

## Technical Details

This extension uses the Raycast API and `node-fetch`. It constructs a potential URL based on the user's input (converting "Bowel Cancer" to `bowel-cancer`) and sends a `HEAD` request to the NICE website.

- **If status 200 (OK):** Opens the direct URL.
- **If status 404 (Not Found):** Opens the query search URL.

## Clinical Disclaimer

**For Educational Use Only.** This tool is designed to assist healthcare students and registered professionals in navigating the BNF or BNFC.
- **Not a Primary Diagnostic Tool:** Any and all calculations, tools or searches provided by this software must be independently verified against local Trust policies and tools, the BNF or BNFC, and should be double-checked by a second qualified practitioner where required.
- **No Liability:** The developer (Jack Smith) accepts no responsibility for any medication errors, clinical omissions, or adverse patient outcomes resulting from the use of this software.

## Author

**Jack Smith** (Student Nurse)

## License

MIT
