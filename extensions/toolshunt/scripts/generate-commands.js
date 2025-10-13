#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 读取工具配置
const toolsConfigPath = path.join(__dirname, "../src/tools-config.ts");
const toolsConfigContent = fs.readFileSync(toolsConfigPath, "utf-8");

// 从配置文件中提取工具列表
const toolsMatch = toolsConfigContent.match(/export const tools: Tool\[\] = \[([\s\S]*?)\];/);
if (!toolsMatch) {
  console.error("Failed to extract tools from tools-config.ts");
  process.exit(1);
}

// 解析工具配置
const toolsJson = toolsMatch[1];
const tools = [];
const toolRegex = /\{[\s\S]*?id: "(.*?)"[\s\S]*?\}/g;
let match;

while ((match = toolRegex.exec(toolsJson)) !== null) {
  tools.push(match[1]);
}

console.log(`Found ${tools.length} tools`);

// 为每个工具生成命令文件
const srcDir = path.join(__dirname, "../src");
tools.forEach((toolId) => {
  const commandContent = `import { showHUD } from "@raycast/api";
import { openTool } from "./utils";

export default async function Command() {
  await openTool("${toolId}");
}
`;

  const commandPath = path.join(srcDir, `${toolId}.tsx`);
  fs.writeFileSync(commandPath, commandContent, "utf-8");
  console.log(`Generated: ${commandPath}`);
});

console.log("✅ All command files generated successfully!");

