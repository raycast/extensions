import { describe, it, expect } from "vitest";
import { FormatterService } from "../src/services/formatter-service";

describe("Performance Test", () => {
  const service = new FormatterService();

  it("should handle large text efficiently", () => {
    const paragraph = "在LeanCloud上，数据存储是围绕AVObject进行的。";
    // Create a large text by repeating the paragraph 2000 times (approx 100k chars)
    const largeText = Array(2000).fill(paragraph).join("\n");
    
    const startTime = performance.now();
    const formatted = service.format(largeText);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`Formatted ${largeText.length} characters in ${duration.toFixed(2)}ms`);
    
    expect(formatted).toBeDefined();
    // Assuming 500ms is a reasonable threshold for 100k chars on a dev machine
    // Adjust as needed based on actual performance
    expect(duration).toBeLessThan(1000); 
  });
});
