"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMessageForDisplay = exports.getReceivedMessages = exports.getSentMessages = exports.getAllClaudeMessages = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const os_1 = require("os");
const CLAUDE_DIR = (0, path_1.join)((0, os_1.homedir)(), ".claude", "projects");
async function parseJsonlFile(filePath, sessionId, projectPath) {
    var _a, _b;
    try {
        const content = await (0, promises_1.readFile)(filePath, "utf-8");
        const lines = content.split("\n").filter(line => line.trim());
        const messages = [];
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                // Check for user messages
                if (data.type === "user" && ((_a = data.message) === null || _a === void 0 ? void 0 : _a.role) === "user") {
                    let content = "";
                    if (data.message.content) {
                        if (typeof data.message.content === "string") {
                            content = data.message.content;
                        }
                        else if (Array.isArray(data.message.content)) {
                            // Handle tool results and other content types
                            content = data.message.content
                                .map(item => {
                                if (item.type === "text") {
                                    return item.text;
                                }
                                else if (item.type === "tool_result") {
                                    return `[Tool Result: ${item.content}]`;
                                }
                                else {
                                    return JSON.stringify(item);
                                }
                            })
                                .join("\n");
                        }
                        else if (typeof data.message.content === "object") {
                            content = JSON.stringify(data.message.content);
                        }
                    }
                    // Only add messages with actual text content
                    if (content && content.trim() && !content.startsWith("[{")) {
                        messages.push({
                            role: "user",
                            content,
                            timestamp: new Date(data.timestamp || Date.now()),
                            sessionId,
                            projectPath
                        });
                    }
                }
                // Check for assistant messages  
                if (data.type === "assistant" && ((_b = data.message) === null || _b === void 0 ? void 0 : _b.role) === "assistant") {
                    let content = "";
                    if (data.message.content) {
                        if (Array.isArray(data.message.content)) {
                            // Extract text from content array
                            content = data.message.content
                                .filter(item => item.type === "text")
                                .map(item => item.text)
                                .join("\n");
                        }
                        else if (typeof data.message.content === "string") {
                            content = data.message.content;
                        }
                    }
                    // Only add messages with actual text content
                    if (content && content.trim()) {
                        messages.push({
                            role: "assistant",
                            content,
                            timestamp: new Date(data.timestamp || Date.now()),
                            sessionId,
                            projectPath
                        });
                    }
                }
            }
            catch (error) {
                // Skip invalid JSON lines
                continue;
            }
        }
        return messages;
    }
    catch (error) {
        console.error(`Error parsing file ${filePath}:`, error);
        return [];
    }
}
async function getProjectMessages(projectDir) {
    try {
        const files = await (0, promises_1.readdir)(projectDir);
        const jsonlFiles = files.filter(file => file.endsWith(".jsonl"));
        const allMessages = [];
        for (const file of jsonlFiles) {
            const filePath = (0, path_1.join)(projectDir, file);
            const sessionId = file.replace(".jsonl", "");
            const messages = await parseJsonlFile(filePath, sessionId, projectDir);
            allMessages.push(...messages);
        }
        return allMessages;
    }
    catch (error) {
        console.error(`Error reading project directory ${projectDir}:`, error);
        return [];
    }
}
async function getAllClaudeMessages() {
    try {
        const projects = await (0, promises_1.readdir)(CLAUDE_DIR);
        const allMessages = [];
        for (const project of projects) {
            const projectPath = (0, path_1.join)(CLAUDE_DIR, project);
            const projectStat = await (0, promises_1.stat)(projectPath);
            if (projectStat.isDirectory()) {
                const messages = await getProjectMessages(projectPath);
                allMessages.push(...messages);
            }
        }
        // Sort by timestamp (newest first)
        return allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    catch (error) {
        console.error("Error reading Claude messages:", error);
        return [];
    }
}
exports.getAllClaudeMessages = getAllClaudeMessages;
async function getSentMessages() {
    const allMessages = await getAllClaudeMessages();
    return allMessages
        .filter(msg => msg.role === "user")
        .map((msg, index) => ({
        ...msg,
        id: `sent-${index}`,
        preview: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : "")
    }));
}
exports.getSentMessages = getSentMessages;
async function getReceivedMessages() {
    const allMessages = await getAllClaudeMessages();
    return allMessages
        .filter(msg => msg.role === "assistant")
        .map((msg, index) => ({
        ...msg,
        id: `received-${index}`,
        preview: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : "")
    }));
}
exports.getReceivedMessages = getReceivedMessages;
function formatMessageForDisplay(message) {
    const date = message.timestamp.toLocaleString();
    return `[${date}]\n\n${message.content}`;
}
exports.formatMessageForDisplay = formatMessageForDisplay;
