# Raycast Figma Variables Extension

## Overview

This Raycast extension allows users to interact with their Figma designs by fetching and displaying variable collections from a Figma file. Users can view details of each variable within a collection, including mode-specific values and code syntax.

## Getting Started

### Finding Your Figma Access Token

1.  Go to the Figma settings page.
2.  Navigate to the 'Access Tokens' section.
3.  Create a new token with the required permissions, ensuring you include the 'read' scope for variables.

### Locating Your File Key

The File Key is part of your Figma file's URL: `https://www.figma.com/design/<FILE_KEY>/...`.

## Using the Extension

1.  **Input Token and File Key**: On launching the extension, enter your Figma access token and file key when prompted.
2.  **Browse Collections**: The extension displays a list of variable collections from the specified Figma file.
3.  **View Variables**: Selecting a collection reveals the variables it contains.
4.  **Variable Details**: Clicking on a variable displays its details, including values for different modes and code syntax.

Ensure your access token has the appropriate permissions to read variables from your Figma files.
