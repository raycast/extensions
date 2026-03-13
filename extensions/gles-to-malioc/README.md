# GLES to MaliOC

Profile GLES shaders using the Mali Offline Compiler (MaliOC) directly from Raycast.

## Features

- **Compile Shader** — Select shader code in any text editor and compile it with MaliOC to get performance statistics
- **Select Shader Variant to Compile** — Parse Unity shader disassembly files containing multiple variants and choose which one to profile
- Automatic shader type detection (vertex/fragment)
- Support for multiple GPU cores
- Export reports in Markdown or JSON format

## Requirements

This extension requires [Arm Performance Studio](https://developer.arm.com/Tools%20and%20Software/Arm%20Performance%20Studio) to be installed, which includes the Mali Offline Compiler.

## Setup

After installing the extension, you need to configure the path to the MaliOC executable:

1. Open Raycast Preferences (`⌘ + ,`)
2. Navigate to Extensions → GLES to MaliOC
3. Set the **MaliOC Executable** path to your Mali Offline Compiler location

## Usage

1. Select shader code in any text editor
2. Open Raycast and run **Compile Shader**
3. Choose shader type (vertex/fragment) if not auto-detected
4. Select target GPU core
5. View performance statistics and cycle counts

For Unity shader disassemblies with multiple variants, use **Select Shader Variant to Compile** to parse and select specific variants.
