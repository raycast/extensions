interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
): Promise<T> {
  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < config.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a rate limit error
      if (error instanceof Error && 
          (error.message.includes('Rate limited') || 
           error.message.includes('429'))) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, retryCount),
          config.maxDelay
        );
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }
      
      // If it's not a rate limit error, throw immediately
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
} 