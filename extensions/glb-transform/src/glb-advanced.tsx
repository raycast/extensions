import { Form, ActionPanel, Action, showHUD, getSelectedFinderItems, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import path from "path";
import { execAsync, execOptions, getFileSize, formatBytes, CompressionResult } from "./utils";

interface FormValues {
  // Geometry Compression
  geometryCompression: string;

  // Texture Compression
  textureCompression: string;
  textureResize: string;

  // Optimizations
  dedup: boolean;
  flatten: boolean;
  join: boolean;
  weld: boolean;
  prune: boolean;
  resample: boolean;
  sparse: boolean;

  // Instance & Palette
  instance: boolean;
  instanceMin: string;
  palette: boolean;
  paletteMin: string;

  // Simplify
  simplify: boolean;
  simplifyRatio: string;
  simplifyError: string;
}

async function transformGlb(filePath: string, values: FormValues): Promise<CompressionResult> {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath, ".glb");
  const outputPath = path.join(dirName, `${baseName}_optimized.glb`);

  try {
    const originalSize = await getFileSize(filePath);

    // Build a chain of individual gltf-transform commands
    // Each command outputs to the same file, processing sequentially
    const commands: string[] = [];
    let currentInput = `"${filePath}"`;
    const output = `"${outputPath}"`;

    // Helper to add a command
    const addCommand = (cmd: string, args: string = "") => {
      commands.push(`gltf-transform ${cmd} ${currentInput} ${output} ${args}`.trim());
      currentInput = output; // Next command uses the output as input
    };

    // 1. Dedup - Remove duplicates first
    if (values.dedup) {
      addCommand("dedup");
    }

    // 2. Instance - Create GPU instances
    if (values.instance) {
      const min = values.instanceMin || "5";
      addCommand("instance", `--min ${min}`);
    }

    // 3. Palette - Create palette textures
    if (values.palette) {
      const min = values.paletteMin || "5";
      addCommand("palette", `--min ${min}`);
    }

    // 4. Flatten - Flatten scene hierarchy (required before join)
    if (values.flatten) {
      addCommand("flatten");
    }

    // 5. Join - Join compatible meshes
    if (values.join) {
      addCommand("join");
    }

    // 6. Weld - Merge duplicate vertices
    if (values.weld) {
      addCommand("weld");
    }

    // 7. Simplify - Reduce vertex count
    if (values.simplify) {
      const ratio = parseFloat(values.simplifyRatio || "0.75");
      addCommand("simplify", `--ratio ${ratio}`);
    }

    // 8. Resample - Optimize animations
    if (values.resample) {
      addCommand("resample");
    }

    // 9. Prune - Remove unused properties
    if (values.prune) {
      addCommand("prune");
    }

    // 10. Sparse - Create sparse accessors
    if (values.sparse) {
      addCommand("sparse");
    }

    // 11. Texture compression
    if (values.textureCompression !== "none") {
      const format = values.textureCompression;
      // Map format to correct command
      const textureCmd = format === "ktx2" ? "etc1s" : format;
      addCommand(textureCmd);
    }

    // 12. Texture resize
    if (values.textureResize !== "none") {
      addCommand("resize", `--width ${values.textureResize} --height ${values.textureResize}`);
    }

    // 13. Geometry compression (should be last)
    if (values.geometryCompression !== "none") {
      addCommand(values.geometryCompression);
    }

    // If no commands were added, just copy the file
    if (commands.length === 0) {
      addCommand("copy");
    }

    // Execute all commands sequentially
    for (const command of commands) {
      await execAsync(command, execOptions);
    }

    const compressedSize = await getFileSize(outputPath);

    return {
      file: fileName,
      success: true,
      originalSize,
      compressedSize,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      file: fileName,
      success: false,
      error: errorMessage,
    };
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      const selectedItems = await getSelectedFinderItems();

      if (selectedItems.length === 0) {
        await showHUD("❌ No files selected in Finder");
        setIsLoading(false);
        return;
      }

      const glbFiles = selectedItems.filter((item) => item.path.toLowerCase().endsWith(".glb"));

      if (glbFiles.length === 0) {
        await showHUD("❌ No GLB files selected");
        setIsLoading(false);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Transforming GLB files...",
        message: `Processing ${glbFiles.length} file${glbFiles.length > 1 ? "s" : ""}`,
      });

      const results: CompressionResult[] = [];

      for (let i = 0; i < glbFiles.length; i++) {
        const file = glbFiles[i];
        toast.message = `Processing ${i + 1}/${glbFiles.length}: ${path.basename(file.path)}`;

        const result = await transformGlb(file.path, values);
        results.push(result);
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (failed.length === 0) {
        const totalOriginal = successful.reduce((acc, r) => acc + (r.originalSize || 0), 0);
        const totalCompressed = successful.reduce((acc, r) => acc + (r.compressedSize || 0), 0);
        const savings = totalOriginal - totalCompressed;
        const savingsPercent = ((savings / totalOriginal) * 100).toFixed(1);

        await showHUD(
          `✅ Optimized ${successful.length} file${successful.length > 1 ? "s" : ""} - Saved ${formatBytes(savings)} (${savingsPercent}%)`,
        );
      } else if (successful.length === 0) {
        await showHUD(`❌ Failed to optimize ${failed.length} file${failed.length > 1 ? "s" : ""}`);
      } else {
        await showHUD(`⚠️ ${successful.length} optimized, ${failed.length} failed`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("Finder")) {
        await showHUD("❌ Select files in Finder first");
      } else {
        await showHUD(`❌ Error: ${errorMessage}`);
      }
    }

    setIsLoading(false);
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transform GLB" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure transformation options for selected GLB files in Finder" />

      <Form.Separator />
      <Form.Description title="🫖 Geometry" text="" />

      <Form.Dropdown id="geometryCompression" title="Compression" defaultValue="draco">
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="draco" title="Draco" />
        <Form.Dropdown.Item value="meshopt" title="Meshopt" />
      </Form.Dropdown>

      <Form.Checkbox id="weld" label="Weld Vertices" defaultValue={true} storeValue />
      <Form.Checkbox id="simplify" label="Simplify Mesh" defaultValue={false} storeValue />
      <Form.TextField
        id="simplifyRatio"
        title="└ Simplify Ratio"
        placeholder="0.75"
        info="Target ratio of original vertices (0.0-1.0). Lower = more simplification"
      />

      <Form.Separator />
      <Form.Description title="🖼 Textures" text="" />

      <Form.Dropdown id="textureCompression" title="Compression" defaultValue="none">
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="ktx2" title="KTX2 (Basis)" />
        <Form.Dropdown.Item value="webp" title="WebP" />
        <Form.Dropdown.Item value="avif" title="AVIF" />
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="jpeg" title="JPEG" />
      </Form.Dropdown>

      <Form.Dropdown id="textureResize" title="Max Size" defaultValue="none">
        <Form.Dropdown.Item value="none" title="Original" />
        <Form.Dropdown.Item value="4096" title="4096px" />
        <Form.Dropdown.Item value="2048" title="2048px" />
        <Form.Dropdown.Item value="1024" title="1024px" />
        <Form.Dropdown.Item value="512" title="512px" />
        <Form.Dropdown.Item value="256" title="256px" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description title="📦 Scene Optimizations" text="" />

      <Form.Checkbox
        id="dedup"
        label="Dedup"
        defaultValue={true}
        storeValue
        info="Remove duplicate meshes, materials, textures"
      />
      <Form.Checkbox
        id="flatten"
        label="Flatten"
        defaultValue={false}
        storeValue
        info="Flatten scene graph hierarchy"
      />
      <Form.Checkbox
        id="join"
        label="Join Meshes"
        defaultValue={false}
        storeValue
        info="Join compatible meshes to reduce draw calls"
      />
      <Form.Checkbox
        id="prune"
        label="Prune"
        defaultValue={true}
        storeValue
        info="Remove unused nodes, textures, materials"
      />

      <Form.Separator />
      <Form.Description title="⏯️ Animation" text="" />

      <Form.Checkbox
        id="resample"
        label="Resample"
        defaultValue={true}
        storeValue
        info="Resample animations, losslessly deduplicating keyframes"
      />
      <Form.Checkbox
        id="sparse"
        label="Sparse Accessors"
        defaultValue={false}
        storeValue
        info="Create sparse accessors where >80% of values are zero"
      />

      <Form.Separator />
      <Form.Description title="🔄 Instancing & Palette" text="" />

      <Form.Checkbox
        id="instance"
        label="GPU Instancing"
        defaultValue={false}
        storeValue
        info="Create GPU instances from shared mesh references"
      />
      <Form.TextField
        id="instanceMin"
        title="└ Min Instances"
        placeholder="5"
        info="Minimum mesh occurrences for instancing"
      />

      <Form.Checkbox
        id="palette"
        label="Palette Textures"
        defaultValue={false}
        storeValue
        info="Create palette textures for compatible material groups"
      />
      <Form.TextField
        id="paletteMin"
        title="└ Min Materials"
        placeholder="5"
        info="Minimum compatible materials for palette"
      />
    </Form>
  );
}
