# GLB Transform

Quickly compress, optimize, and inspect GLB files using gltf-transform.

## 🛠️ Command Reference

This extension provides a suite of commands for common GLB operations.

| Command Title | Description | Underlying gltf-transform Operation |
| :--- | :--- | :--- |
| **Draco Compress GLB** | Applies **Draco** compression to mesh geometry for high size reduction. | `gltf-transform draco` |
| **KTX Compress GLB** | Applies **KTX/BasisU** compression to textures, improving load times and reducing file size. | `gltf-transform ktx` |
| **Draco and KTX Compress GLB** | A one-click command that applies both **Draco** (geometry) and **KTX** (texture) compression. | `gltf-transform draco & ktx` |
| **Advanced GLB Transform** | Provides a form interface to apply complex, chained optimizations like **Simplify**, **Dedup**, **Weld**, and **Instancing**. | Chained gltf-transform commands |
| **Inspect GLB File** | Displays a detailed analysis and report of the file's structure, scenes, materials, and potential issues. | `gltf-transform inspect` |

## Requirements and Installation

This extension is a wrapper around the **gltf-transform CLI** and **KTX-Software** tools. You must have both installed on your system for the compression commands to work.

### 1. Install gltf-transform CLI

The core transformations are handled by `gltf-transform`. Install it globally using npm:

```bash
npm install --global @gltf-transform/cli
```

### 2. Install KTX-Software Tools (for KTX Compression)
The commands for KTX Texture Compression (KTX Compress GLB and Draco and KTX Compress GLB) require the toktx tool from the KTX-Software suite

- Download the latest release for your platform (macOS/Windows) from the [KTX-Software GitHub Releases](https://github.com/KhronosGroup/KTX-Software/releases).

- The release package contains the necessary executables. You will need to ensure the toktx executable is placed into a directory that is included in your system's PATH environment variable (e.g., /usr/local/bin or similar on macOS/Linux, or adding the directory to PATH on Windows).