export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    sessionId: string;
    projectPath?: string;
}
export interface ParsedMessage extends Message {
    id: string;
    preview: string;
}
export declare function getAllClaudeMessages(): Promise<Message[]>;
export declare function getSentMessages(): Promise<ParsedMessage[]>;
export declare function getReceivedMessages(): Promise<ParsedMessage[]>;
export declare function formatMessageForDisplay(message: ParsedMessage): string;
//# sourceMappingURL=claudeMessages.d.ts.map