import { Clipboard } from "@raycast/api";
import { ClipboardAdapter } from "../../../core/adapters/index.js";
import { mdlog } from "../../../core/logging.js";
import { debugConfig, createUtf8Env } from "../../../core/env.js";

const debugLog = (...args: unknown[]) => {
  if (debugConfig.clipboardDebug) {
    console.log(...args);
  }
};

export class RaycastClipboardAdapter implements ClipboardAdapter {
  /**
   * Raycast launches processes with a complex locale that pbpaste doesn't understand.
   * We must ensure UTF-8 encoding, otherwise emoji get corrupted into question marks.
   * 
   * Solution: Override with a simple UTF-8 locale that pbpaste understands.
   * We try to preserve the user's language preference when possible.
   */
  private getExecOptions(): { encoding: string; env: Record<string, string> } {
    return { encoding: "utf8", env: createUtf8Env() };
  }

  async readHtml(): Promise<string | null> {
    try {
  debugLog('Attempting to read HTML from system clipboard...');
      
      // Use dynamic import to avoid TypeScript issues
      const { execSync } = await import('child_process');
      
      const execOptions = this.getExecOptions();
      
      // Try the public.html format which we know works for Word/Office content
      try {
  debugLog('Reading HTML from public.html format...');
        const content = execSync('pbpaste -Prefer public.html', { 
          ...execOptions,
          encoding: 'utf8'
        });
        
        if (content && typeof content === 'string' && content.trim()) {
          // Check if it actually contains HTML tags
          if (content.includes('<') && content.includes('>')) {
            debugLog(`Found HTML content (${content.length} chars):`, content.substring(0, 200) + '...');
            
            return content;
          }
        }
      } catch (error) {
  debugLog('public.html format failed:', error);
      }

      // Try default pbpaste without format specification
      try {
  debugLog('Trying default pbpaste...');
        const defaultContent = execSync('pbpaste', { 
          ...execOptions,
          encoding: 'utf8'
        });
        
  debugLog('Default content:', typeof defaultContent, defaultContent.length, defaultContent.substring(0, 100));
      } catch (error) {
  debugLog('Default pbpaste failed:', error);
      }

  debugLog('No HTML content found in clipboard');
      return null;
    } catch (error) {
      mdlog('warn', 'clipboard', 'Failed to read HTML from clipboard', error);
      return null;
    }
  }

  async readText(): Promise<string | null> {
    try {
      const content = await Clipboard.readText();
      // Ensure we return a string or null
      if (typeof content === 'string') {
        return content;
      }
      return null;
    } catch (error) {
      mdlog('warn', 'clipboard', 'Failed to read text from clipboard', error);
      return null;
    }
  }

  async writeText(text: string): Promise<void> {
    try {
      await Clipboard.copy(text);
    } catch (error) {
      mdlog('error', 'clipboard', 'Failed to write text to clipboard', error);
      throw error;
    }
  }
}