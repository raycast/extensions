# Protein Structure Viewer for Raycast

A Raycast extension to quickly view and access protein structure information from the [RCSB Protein Data Bank (PDB)](https://www.rcsb.org/).

## Features

- Search for proteins using their PDB ID
- View detailed protein information including:
  - Protein title and release date
  - Polymer entities with chain information
  - Small molecule details (ligands) including:
    - Chemical names
    - Molecular formulas
    - InChI Keys
- Quick actions:
  - Open protein structure in PDB website
  - Copy PDB URL
  - Copy PDB ID
  - Copy protein title

## Usage

1. Open Raycast
2. Search for "Find Protein"
3. Enter a valid PDB ID (e.g., "1AKE")
4. View the protein information

## Keyboard Shortcuts

- `⌘ + O` - Open protein in PDB website
- `⌘ + .` - Copy PDB URL
- `⌘ + ⇧ + .` - Copy PDB ID
- `⌘ + ⌥ + .` - Copy protein title

## Data Source

This extension uses the RCSB PDB GraphQL API to fetch protein structure information. All data is retrieved from [RCSB Protein Data Bank](https://www.rcsb.org/).

## Requirements

- [Raycast](https://www.raycast.com) v1.51.1 or higher (might work on older versions, but not tested)

## Installation

1. Open Raycast
2. Search for "Extension Store"
3. Search for "Protein Structure Viewer"
4. Click Install

## Commands

### Search Protein
Search for protein structures using their PDB ID. This command provides a search interface where you can enter a 4-character PDB ID (e.g., "1AKE") to view detailed information about the protein structure.
View [Screenshot #1](assets/view1.png) and [Screenshot #2](assets/view2.png)

### Open in PDB
Quickly open the protein structure page in the RCSB PDB website. This command takes you directly to the official entry page where you can view the 3D structure, download files, and access additional information.
View [Screenshot](assets/view3.png)

### Copy PDB URL
Copy the URL of the protein structure page to your clipboard. Useful for sharing links to specific protein structures with others.
View [Screenshot](assets/view4.png)

### Copy PDB ID
Copy the 4-character PDB ID to your clipboard. Helpful when you need to reference the protein structure in other tools or publications.
View [Screenshot](assets/view4.png)

### Copy PDB Title
Copy full title of the protein structure to your clipboard. The title typically includes information about the protein name, organism, and experimental conditions.
[View Screenshot](assets/view4.png)

## License
MIT License

