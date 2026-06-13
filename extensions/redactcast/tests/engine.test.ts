import { describe, expect, it } from 'vitest';
import { maskText, rehydrateText } from '../src/engine';

describe('RedactCast Engine', () => {
  it('should mask and rehydrate an email', async () => {
    const originalText = "Hello, my email is john.doe@example.com. Please reply.";
    const { maskedText, mapping } = await maskText(originalText);

    expect(maskedText).toBe("Hello, my email is [EMAIL_1]. Please reply.");
    expect(mapping['[EMAIL_1]']).toBe("john.doe@example.com");

    const restoredText = rehydrateText(maskedText, mapping);
    expect(restoredText).toBe(originalText);
  });

  it('should mask multiple instances of the same email with the same token', async () => {
    const originalText = "Contact john@example.com or reply to john@example.com.";
    const { maskedText, mapping } = await maskText(originalText);

    expect(maskedText).toBe("Contact [EMAIL_1] or reply to [EMAIL_1].");
    expect(Object.keys(mapping).length).toBe(1);

    const restoredText = rehydrateText(maskedText, mapping);
    expect(restoredText).toBe(originalText);
  });

  it('should handle multiple different PII types', async () => {
    const originalText = "Server 192.168.1.1 crashed. Email admin@corp.com.";
    const { maskedText, mapping } = await maskText(originalText);

    expect(maskedText).toBe("Server [IP_1] crashed. Email [EMAIL_1].");
    
    const restoredText = rehydrateText(maskedText, mapping);
    expect(restoredText).toBe(originalText);
  });
});
