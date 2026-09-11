# Project Structure

This document describes the modular and scalable architecture of the EditingTools extension.

## Overview

The project uses a **dynamic, configuration-driven architecture** where all shaders are defined through configuration files. This makes adding new shaders extremely simple - just create a configuration file and register it.

## Directory Structure

```
src/
├── config/                      # Shader configuration system
│   ├── types.ts                 # TypeScript interfaces and types
│   ├── common.ts                # Common parameters shared by all shaders
│   ├── shaders.ts               # Central shader registry
│   └── shaders/                 # Individual shader configurations
│       ├── edit.ts              # Edit shader configuration
│       ├── dither.ts            # Dither shader configuration
│       ├── ascii.ts             # ASCII art shader configuration
│       └── brick.ts             # Brick (LEGO-like) shader configuration
│
├── hooks/                       # React hooks
│   └── useShaderParameters.ts   # Universal parameter management hook
│
├── components/                  # UI components
│   ├── ShaderActions.tsx        # Dynamic ActionPanel generation
│   ├── ShaderMetadata.tsx       # Dynamic metadata generation
│   ├── ShaderSettingsForm.tsx   # Universal settings form for all shaders
│   ├── StepSizeForm.tsx         # Step size configuration form
│   └── SaveImageForm.tsx        # Image saving form
│
├── utils/                       # Utility functions
│   ├── processors/              # Modular shader processors
│   │   ├── common.ts            # Common utility functions (hash, saturate, etc.)
│   │   ├── index.ts             # Processor registry and exports
│   │   ├── edit.ts              # Edit processor
│   │   ├── dither.ts            # Dither processor
│   │   ├── ascii.ts             # ASCII processor
│   │   └── brick.ts             # Brick processor
│   ├── imageProcessor.ts        # Legacy file (backwards compatibility)
│   ├── shaderProcessor.ts       # Dynamic shader router
│   ├── parameterMapper.ts       # Universal parameter mapping system
│   ├── tempFileManager.ts       # Temporary file management utilities
│   └── fileValidation.ts        # File validation and sanitization utilities
│
├── instruction-add-shader.md    # Instructions for adding new shaders
└── ishader.tsx                  # Main application component
```

## Architecture Overview

### 1. Configuration System (`config/`)

All shaders are defined through configuration objects that specify:

- **Parameters**: Types, defaults, validation rules, UI metadata
- **Processor**: Function name to call for image processing
- **Metadata**: Display name, description, GLSL file path

**Key Files:**

- `types.ts`: Core interfaces (`ShaderParameter`, `ShaderConfig`)
- `common.ts`: Shared parameters (blur, grain, gamma, etc.)
- `shaders.ts`: Central registry that imports all shader configs
- `shaders/*.ts`: Individual shader configurations

### 2. Parameter Management (`hooks/useShaderParameters.ts`)

Universal hook that:

- Initializes parameters from shader configuration
- Validates parameter values based on type and constraints
- Automatically resets when shader changes
- Provides type-safe parameter updates

### 3. Dynamic UI Components (`components/`)

All UI components are dynamically generated from shader configurations:

- **ShaderActions**: Generates ActionPanel with actions for all parameters
  - Automatically creates increment/decrement actions for numeric params
  - Handles enum switching, boolean toggles
  - Groups parameters by category (effect, preprocessing, common)

- **ShaderMetadata**: Generates metadata display
  - Shows all parameters marked with `metadata: true`
  - Formats labels with keyboard shortcuts (e.g., "Pixel Size 1/q")
  - Automatically formats values based on parameter type

- **ShaderSettingsForm**: Universal form for editing all shader parameters
  - Dynamically generates form fields based on parameter types
  - Groups parameters by category
  - Validates inputs based on configuration constraints

### 4. Processing System (`utils/`)

- **processors/**: Modular shader processor system:
  - **common.ts**: Shared utility functions (hash21, saturate, luminance, etc.)
  - **index.ts**: Central processor registry - single place to register all processors
  - Each processor is in its own file (edit.ts, dither.ts, ascii.ts, brick.ts, etc.)
  - Each processor exports both the function and parameter types

- **shaderProcessor.ts**: Dynamic router that:
  - Uses processor registry to map shader IDs to processor functions
  - Automatically converts generic parameters to shader-specific format
  - Fully dynamic - no manual registration needed beyond processors/index.ts

- **parameterMapper.ts**: Universal parameter mapping system:
  - Single function `createShaderParams()` works for all shaders
  - Maps parameter names when needed (can be configured per shader)
  - Handles type conversion automatically
  - No need for shader-specific mapper functions

- **tempFileManager.ts**: Temporary file management utilities:
  - Safe file deletion with error handling
  - Automatic cleanup of old temporary files
  - Prevents file system clutter

- **fileValidation.ts**: File validation and sanitization utilities:
  - Image file format validation
  - File size and dimension checks
  - Filename sanitization for safe file operations

- **imageProcessor.ts**: Legacy file kept for backwards compatibility
  - Re-exports types and processors from processors/

## Adding a New Shader

To add a new shader, follow these steps:

### 1. Create Shader Configuration

Create `src/config/shaders/yourShader.ts`:

```typescript
import { ShaderParameter, ShaderConfig } from "../types";
import { COMMON_PARAMETERS } from "../common";

export const YOUR_SHADER_PARAMETERS: ShaderParameter[] = [
  // Effect-specific parameters (order 0-99)
  {
    id: "yourParam",
    label: "Your Parameter",
    type: "float",
    default: 1.0,
    min: 0,
    max: 10,
    step: 0.1,
    shortcut: { modifiers: [], key: "1" },
    decrementShortcut: { modifiers: [], key: "q" },
    category: "effect",
    metadata: true,
    order: 1,
  },
  // Common parameters come last
  ...COMMON_PARAMETERS,
];

export const YOUR_SHADER_CONFIG: ShaderConfig = {
  id: "yourShader",
  name: "Your Shader",
  description: "Description of your shader",
  glslFile: "assets/shaders/your-shader.glsl",
  processor: "processImageWithYourShader",
  parameters: YOUR_SHADER_PARAMETERS,
};
```

### 2. Register Configuration

Add to `src/config/shaders.ts`:

```typescript
import { YOUR_SHADER_CONFIG } from "./shaders/yourShader";

export const SHADER_CONFIGS: ShaderConfig[] = [
  // ... existing shaders
  processConfig(YOUR_SHADER_CONFIG),
];
```

### 3. Create Processor Module

Create `src/utils/processors/yourShader.ts`:

```typescript
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import Jimp from "jimp";
import { saturate, hash21 } from "./common"; // Import shared utilities

export interface YourShaderParams {
  yourParam: number;
  showEffect: boolean;
  blur: number;
  // ... other params
}

export async function processImageWithYourShader(
  inputImagePath: string,
  params: YourShaderParams,
  outputPath?: string,
): Promise<string> {
  // Load and process image
  const image = await Jimp.read(inputImagePath);
  // ... your implementation

  // Save and return output path
  const finalOutputPath = outputPath || path.join(environment.supportPath, `your-shader-output-${Date.now()}.png`);
  await image.writeAsync(finalOutputPath);
  return finalOutputPath;
}
```

### 4. Register Processor

Add to `src/utils/processors/index.ts`:

```typescript
import { processImageWithYourShader, YourShaderParams } from "./yourShader";

export const PROCESSOR_REGISTRY: Record<string, ProcessorEntry> = {
  // ... existing processors
  yourShader: {
    processor: processImageWithYourShader,
    paramTypes: {} as YourShaderParams,
  },
};

// Re-export types
export type { YourShaderParams };
export { processImageWithYourShader };
```

That's it! No need to:

- ❌ Create parameter mapper function (handled automatically)
- ❌ Register in shaderProcessor.ts (uses registry automatically)

The UI will automatically:

- Display the shader in the effects list
- Generate all parameter controls
- Create the settings form
- Handle parameter validation
- Process images with your shader

## Parameter Types

The system supports the following parameter types:

- **`float`**: Floating-point number (min, max, step validation)
- **`int`**: Integer number (min, max, step validation)
- **`bool`**: Boolean toggle
- **`string`**: Text string
- **`enum`**: Selection from predefined options

## Parameter Properties

Each parameter can have:

- **Basic**: `id`, `label`, `type`, `default`
- **Validation**: `min`, `max`, `step`
- **UI**: `shortcut`, `incrementShortcut`, `decrementShortcut`, `metadata`
- **Organization**: `category` (effect/preprocessing/common), `order`
- **Help**: `info` (tooltip text)

## Design Principles

1. **Configuration-Driven**: All shader behavior defined in config files
2. **Dynamic UI Generation**: No hardcoded UI elements
3. **Type Safety**: Full TypeScript support throughout
4. **Scalability**: Easy to add new shaders without modifying core code
5. **Separation of Concerns**: Clear separation between config, UI, and processing

## Benefits

- ✅ **Easy to extend**: Add new shaders by creating config file + processor module (2 files only!)
- ✅ **Single registration point**: Only need to register in `processors/index.ts` (1 location instead of 3)
- ✅ **Automatic parameter mapping**: No need to create mapper functions - handled automatically
- ✅ **Modular processors**: Each shader processor is isolated in its own file
- ✅ **Consistent UI**: All shaders use the same UI patterns
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Maintainable**: Clear structure and separation of concerns
- ✅ **DRY**: Common parameters and utilities defined once, reused everywhere.
