# Adding a New Shader

Follow these 4 steps to add a new shader:

## 1. Create Shader Configuration

Create `src/config/shaders/yourShader.ts`:

```typescript
import { ShaderParameter, ShaderConfig } from "../types";
import { COMMON_PARAMETERS } from "../common";

export const YOUR_SHADER_PARAMETERS: ShaderParameter[] = [
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

## 2. Register Configuration

Add to `src/config/shaders.ts`:

```typescript
import { YOUR_SHADER_CONFIG } from "./shaders/yourShader";

export const SHADER_CONFIGS: ShaderConfig[] = [
  // ... existing shaders
  processConfig(YOUR_SHADER_CONFIG),
];
```

## 3. Create Processor Module

Create `src/utils/processors/yourShader.ts`:

```typescript
import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import Jimp from "jimp";
import { saturate, hash21 } from "./common";

export interface YourShaderParams {
  yourParam: number;
  showEffect: boolean;
  blur: number;
  grain: number;
  gamma: number;
  blackPoint: number;
  whitePoint: number;
}

export async function processImageWithYourShader(
  inputImagePath: string,
  params: YourShaderParams,
  outputPath?: string,
): Promise<string> {
  const image = await Jimp.read(inputImagePath);
  const width = image.getWidth();
  const height = image.getHeight();

  if (params.blur > 0) {
    image.blur(params.blur);
  }

  // Your processing logic here
  image.scan(0, 0, width, height, function (x, y) {
    const color = Jimp.intToRGBA(this.getPixelColor(x, y));
    // Process pixel...
    this.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
  });

  const finalOutputPath = outputPath || path.join(environment.supportPath, `your-shader-output-${Date.now()}.png`);

  const supportDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(supportDir)) {
    fs.mkdirSync(supportDir, { recursive: true });
  }

  await image.writeAsync(finalOutputPath);
  return finalOutputPath;
}
```

## 4. Register Processor

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

Done! The UI will automatically generate controls, forms, and handle processing.
