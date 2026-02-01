/* eslint-disable */
import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import { basename } from "path";
import { randomUUID } from "crypto";

interface WorkflowNode {
  class_type?: string;
  inputs?: Record<string, any>;
  _meta?: {
    title?: string;
  };
}

interface Workflow {
  [key: string]: WorkflowNode;
}

export async function getWorkflows(
  workflowsPath: string,
): Promise<{ name: string; path: string }[]> {
  try {
    const files = await fs.readdir(workflowsPath);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: `${workflowsPath}/${f}`,
      }));
  } catch {
    return [];
  }
}

export async function analyzeWorkflow(workflowPath: string): Promise<{
  hasLoadImage: boolean;
  hasPromptNode: boolean;
}> {
  try {
    const content = await fs.readFile(workflowPath, "utf-8");
    const workflow: Workflow = JSON.parse(content);

    let hasLoadImage = false;
    let hasPromptNode = false;

    for (const node of Object.values(workflow)) {
      if (node.class_type === "LoadImage") {
        hasLoadImage = true;
      }
      if (
        node.class_type === "PrimitiveStringMultiline" ||
        node.class_type === "CLIPTextEncode" ||
        node.class_type === "ImpactWildcardProcessor"
      ) {
        hasPromptNode = true;
      }
    }

    return { hasLoadImage, hasPromptNode };
  } catch {
    return { hasLoadImage: false, hasPromptNode: false };
  }
}

async function checkServerAvailability(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/system_stats`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function turnOnServer(
  haUrl?: string,
  haToken?: string,
  switchEntity?: string,
): Promise<boolean> {
  if (!haUrl || !haToken || !switchEntity) {
    return false;
  }

  try {
    const response = await fetch(`${haUrl}/api/services/switch/turn_on`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_id: switchEntity,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureServerRunning(
  serverUrl: string,
  haUrlInternal?: string,
  haUrlExternal?: string,
  haToken?: string,
  switchEntity?: string,
): Promise<boolean> {
  // Zkontrolovat zda server už běží
  if (await checkServerAvailability(serverUrl)) {
    return true;
  }

  // Pokud neběží, zkusit ho zapnout přes HA
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Server není dostupný",
    message: "Pokouším se zapnout...",
  });

  // Zkusit interní URL
  if (
    haUrlInternal &&
    (await turnOnServer(haUrlInternal, haToken, switchEntity))
  ) {
    toast.message = "Čekám na naběhnutí serveru...";

    // Počkat až server naběhne (max 5 minut)
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (await checkServerAvailability(serverUrl)) {
        toast.style = Toast.Style.Success;
        toast.title = "Server je připraven";
        return true;
      }
    }
  }

  // Zkusit externí URL jako fallback
  if (
    haUrlExternal &&
    (await turnOnServer(haUrlExternal, haToken, switchEntity))
  ) {
    toast.message = "Čekám na naběhnutí serveru...";

    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (await checkServerAvailability(serverUrl)) {
        toast.style = Toast.Style.Success;
        toast.title = "Server je připraven";
        return true;
      }
    }
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Server není dostupný";
  toast.message = "Zkontrolujte připojení";
  return false;
}

async function uploadImage(
  serverUrl: string,
  imagePath: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("image", createReadStream(imagePath));
  formData.append("overwrite", "true");

  const response = await fetch(`${serverUrl}/upload/image`, {
    method: "POST",
    body: formData as any,
  });

  if (!response.ok) {
    throw new Error(`Chyba uploadu: ${response.statusText}`);
  }

  const result: any = await response.json();
  return result.name || basename(imagePath);
}

function setWorkflowImage(workflow: Workflow, imageFilename: string): Workflow {
  const updated = { ...workflow };

  for (const [nodeId, node] of Object.entries(updated)) {
    if (node.class_type === "LoadImage") {
      if (!node.inputs) {
        node.inputs = {};
      }
      node.inputs.image = imageFilename;
    }
  }

  return updated;
}

function setWorkflowPrompt(workflow: Workflow, promptText: string): Workflow {
  const updated = { ...workflow };
  const promptKeywords = ["prompt", "positive", "text prompt", "clip text"];

  for (const [nodeId, node] of Object.entries(updated)) {
    const classType = node.class_type || "";
    const metaTitle = (node._meta?.title || "").toLowerCase();
    let isPromptNode = false;
    let fieldName: string | null = null;

    if (classType === "PrimitiveStringMultiline") {
      if (promptKeywords.some((kw) => metaTitle.includes(kw))) {
        isPromptNode = true;
        fieldName = "value";
      } else if (node.inputs && "value" in node.inputs) {
        isPromptNode = true;
        fieldName = "value";
      }
    } else if (classType === "CLIPTextEncode") {
      if (
        promptKeywords.some((kw) => metaTitle.includes(kw)) &&
        !metaTitle.includes("negative")
      ) {
        isPromptNode = true;
        fieldName = "text";
      } else if (node.inputs && "text" in node.inputs) {
        isPromptNode = true;
        fieldName = "text";
      }
    } else if (classType === "ImpactWildcardProcessor") {
      if (promptKeywords.some((kw) => metaTitle.includes(kw))) {
        isPromptNode = true;
        fieldName = "wildcard_text";
      }
    }

    if (isPromptNode && fieldName) {
      if (!node.inputs) {
        node.inputs = {};
      }
      node.inputs[fieldName] = promptText;
    }
  }

  return updated;
}

async function sendWorkflow(
  serverUrl: string,
  workflow: Workflow,
): Promise<string> {
  const clientId = randomUUID();
  const data = {
    prompt: workflow,
    client_id: clientId,
  };

  const response = await fetch(`${serverUrl}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Chyba odeslání workflow: ${response.statusText}`);
  }

  const result: any = await response.json();
  return result.prompt_id;
}

async function waitForCompletion(
  serverUrl: string,
  promptId: string,
  timeout = 300000,
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${serverUrl}/history/${promptId}`);
      const history: any = await response.json();

      if (history[promptId] && history[promptId].outputs) {
        return history[promptId];
      }
    } catch {
      // Ignorovat chyby a zkusit znovu
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timeout při čekání na dokončení");
}

async function downloadResults(
  serverUrl: string,
  promptResult: any,
  originalPath: string,
  outputSuffix: string,
): Promise<string[]> {
  const outputs = promptResult.outputs;
  const results: string[] = [];

  for (const nodeOutputs of Object.values(outputs)) {
    const nodeData = nodeOutputs as any;
    if (nodeData.images) {
      for (let i = 0; i < nodeData.images.length; i++) {
        const img = nodeData.images[i];
        const url = `${serverUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(
          img.subfolder || "",
        )}&type=${encodeURIComponent(img.type)}`;

        const response = await fetch(url);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();

        // Detect file extension from ComfyUI filename
        const comfyFilename = img.filename;
        const comfyExt = comfyFilename.substring(
          comfyFilename.lastIndexOf("."),
        );

        let outputPath: string;

        // If we have original file (img2img workflow)
        if (originalPath.includes("/") && !originalPath.endsWith("generated")) {
          const dir = originalPath.substring(0, originalPath.lastIndexOf("/"));
          const baseName = basename(originalPath).replace(/\.[^.]+$/, ""); // Remove original extension
          // Use ComfyUI's extension (might be different from input)
          outputPath = `${dir}/${baseName}${outputSuffix}${comfyExt}`;
        } else {
          // Text2img workflow - use original ComfyUI filename
          const dir = originalPath.endsWith("generated")
            ? originalPath.replace("/generated", "")
            : originalPath;
          outputPath = `${dir}/${comfyFilename}`;
        }

        await fs.writeFile(outputPath, new Uint8Array(buffer));
        results.push(outputPath);
      }
    }
  }

  return results;
}

export async function processImages(
  serverUrl: string,
  workflowPath: string,
  imagePaths: string[],
  outputSuffix: string,
  promptText?: string,
  onProgress?: (current: number, total: number) => void,
  outputFolder?: string,
): Promise<string[]> {
  // Načíst workflow
  const workflowContent = await fs.readFile(workflowPath, "utf-8");
  let workflow: Workflow = JSON.parse(workflowContent);

  // Aplikovat prompt pokud je zadán
  if (promptText) {
    workflow = setWorkflowPrompt(workflow, promptText);
  }

  const allResults: string[] = [];

  // Pokud nejsou žádné obrázky (jen prompt), vygeneruj jeden výstup
  if (imagePaths.length === 0) {
    // Odeslat workflow bez obrázku
    const promptId = await sendWorkflow(serverUrl, workflow);

    // Počkat na dokončení
    const promptResult = await waitForCompletion(serverUrl, promptId);

    // Stáhnout výsledky do specifikované složky
    const results = await downloadResults(
      serverUrl,
      promptResult,
      outputFolder ? `${outputFolder}/generated` : "generated",
      outputSuffix,
    );
    allResults.push(...results);

    if (onProgress) {
      onProgress(1, 1);
    }
  } else {
    // Standardní zpracování s obrázky
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];

      // Upload obrázku
      const uploadedFilename = await uploadImage(serverUrl, imagePath);

      // Nastavit obrázek do workflow
      const imageWorkflow = setWorkflowImage(workflow, uploadedFilename);

      // Odeslat workflow
      const promptId = await sendWorkflow(serverUrl, imageWorkflow);

      // Počkat na dokončení
      const promptResult = await waitForCompletion(serverUrl, promptId);

      // Stáhnout výsledky
      const results = await downloadResults(
        serverUrl,
        promptResult,
        imagePath,
        outputSuffix,
      );
      allResults.push(...results);

      // Update progress
      if (onProgress) {
        onProgress(i + 1, imagePaths.length);
      }
    }
  }

  return allResults;
}
