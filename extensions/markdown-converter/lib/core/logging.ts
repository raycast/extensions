/**
 * Simple, consistent logging for mdconv.
 * Provides LLM-readable patterns without over-engineering.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogComponent = 'converter' | 'clipboard' | 'dom-parser' | 'chrome-popup' | 'raycast-ui';

// Simple standardized logging function
// Creates consistent [mdconv:component] patterns for easy scanning

import { debugConfig } from "./env.js";

/**
 * Simple standardized logging function for mdconv components.
 * Creates consistent [mdconv:component] patterns for easy scanning by LLMs and humans.
 * 
 * @param level - Log severity level ('debug', 'info', 'warn', 'error')
 * @param component - Component identifier for categorization
 * @param message - Log message content
 * @param data - Optional additional data to include in the log
 */
export function mdlog(level: LogLevel, component: LogComponent, message: string, data?: any): void {
  // Skip debug logs in production/test environments
  if (level === 'debug') {
    if (debugConfig.isTest) return;
    if (!debugConfig.allDebug) return;
  }

  const prefix = `[mdconv:${component}]`;
  const logMessage = data !== undefined ? `${prefix} ${message}` : `${prefix} ${message}`;

  switch (level) {
    case 'debug':
      console.debug(logMessage, data);
      break;
    case 'info':
      console.info(logMessage, data);
      break;
    case 'warn':
      console.warn(logMessage, data);
      break;
    case 'error':
      console.error(logMessage, data);
      break;
  }
}