import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamRecoveryManager, StreamErrorType } from '../../src/utils/stream-recovery';

describe('StreamRecoveryManager', () => {
  let manager: StreamRecoveryManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new StreamRecoveryManager();
  });

  describe('classifyError', () => {
    it('should classify abort errors correctly', () => {
      const error = new Error('Request aborted');
      error.name = 'AbortError';
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.ABORTED);
      expect(classified.retryable).toBe(false);
    });

    it('should classify timeout errors correctly', () => {
      const error = new Error('Request timeout');
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.TIMEOUT);
      expect(classified.retryable).toBe(true);
    });

    it('should classify auth errors correctly', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.AUTH);
      expect(classified.retryable).toBe(false);
      expect(classified.statusCode).toBe(401);
    });

    it('should classify rate limit errors correctly', () => {
      const error = { statusCode: 429, message: 'Rate limit exceeded' };
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.RATE_LIMIT);
      expect(classified.retryable).toBe(true);
      expect(classified.statusCode).toBe(429);
    });

    it('should classify server errors correctly', () => {
      const error = { statusCode: 500, message: 'Internal server error' };
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.SERVER);
      expect(classified.retryable).toBe(true);
      expect(classified.statusCode).toBe(500);
    });

    it('should classify token limit errors correctly', () => {
      const error = new Error('Maximum token limit exceeded');
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.TOKEN_LIMIT);
      expect(classified.retryable).toBe(false);
    });

    it('should classify network errors correctly', () => {
      const error = new Error('fetch failed due to network issue');
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.NETWORK);
      expect(classified.retryable).toBe(true);
    });

    it('should classify unknown errors correctly', () => {
      const error = new Error('Some random error');
      const classified = manager.classifyError(error);
      
      expect(classified.type).toBe(StreamErrorType.UNKNOWN);
      expect(classified.retryable).toBe(true);
    });
  });

  describe('shouldRetry', () => {
    it('should not retry non-retryable errors', async () => {
      const error = {
        type: StreamErrorType.AUTH,
        message: 'Unauthorized',
        retryable: false,
        timestamp: Date.now(),
      };
      
      const shouldRetry = await manager.shouldRetry(error);
      expect(shouldRetry).toBe(false);
    });

    it('should retry retryable errors within max attempts', async () => {
      const error = {
        type: StreamErrorType.NETWORK,
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };
      
      const shouldRetry = await manager.shouldRetry(error);
      expect(shouldRetry).toBe(true);
    });

    it('should not retry after max attempts exceeded', async () => {
      const manager = new StreamRecoveryManager({ maxRetries: 2 });
      const error = {
        type: StreamErrorType.NETWORK,
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };
      
      // Simulate max retries
      await manager.prepareRetry(error);
      await manager.prepareRetry(error);
      
      const shouldRetry = await manager.shouldRetry(error);
      expect(shouldRetry).toBe(false);
    });

    it('should call onRecoveryFailed when max retries exceeded', async () => {
      const onRecoveryFailed = vi.fn();
      const manager = new StreamRecoveryManager({ 
        maxRetries: 1,
        onRecoveryFailed,
      });
      
      const error = {
        type: StreamErrorType.NETWORK,
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };
      
      await manager.prepareRetry(error);
      await manager.shouldRetry(error);
      
      expect(onRecoveryFailed).toHaveBeenCalledWith(error);
    });
  });

  describe('prepareRetry', () => {
    it('should increment attempts and update state', async () => {
      const error = {
        type: StreamErrorType.NETWORK,
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };
      
      await manager.prepareRetry(error);
      const state = manager.getState();
      
      expect(state.attempts).toBe(1);
      expect(state.lastError).toEqual(error);
      expect(state.isRecovering).toBe(true);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const manager = new StreamRecoveryManager({ onRetry });
      
      const error = {
        type: StreamErrorType.NETWORK,
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };
      
      await manager.prepareRetry(error);
      
      expect(onRetry).toHaveBeenCalledWith(1, error);
    });
  });

  describe('partial content recovery', () => {
    it('should update partial content when enabled', () => {
      const content = 'Partial response';
      const eventId = 'event-123';
      
      manager.updatePartialContent(content, eventId);
      const state = manager.getState();
      
      expect(state.partialContent).toBe(content);
      expect(state.lastEventId).toBe(eventId);
    });

    it('should not update partial content when disabled', () => {
      const manager = new StreamRecoveryManager({ enablePartialRecovery: false });
      const content = 'Partial response';
      
      manager.updatePartialContent(content);
      const state = manager.getState();
      
      expect(state.partialContent).toBeUndefined();
    });

    it('should include Last-Event-ID header for recovery', () => {
      const eventId = 'event-123';
      manager.updatePartialContent('content', eventId);
      
      const headers = manager.getRecoveryHeaders();
      
      expect(headers['Last-Event-ID']).toBe(eventId);
    });
  });

  describe('abort handling', () => {
    it('should create abort controller with timeout', () => {
      vi.useFakeTimers();
      const manager = new StreamRecoveryManager({ timeout: 1000 });
      
      const controller = manager.createAbortController();
      expect(controller).toBeDefined();
      
      vi.advanceTimersByTime(1001);
      expect(controller.signal.aborted).toBe(true);
      
      vi.useRealTimers();
    });

    it('should abort active controller', () => {
      const controller = manager.createAbortController();
      const abortSpy = vi.spyOn(controller, 'abort');
      
      manager.abort();
      
      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const error = {
        type: StreamErrorType.NETWORK,
        message: 'Network error',
        retryable: true,
        timestamp: Date.now(),
      };
      
      await manager.prepareRetry(error);
      manager.updatePartialContent('content', 'event-123');
      
      manager.reset();
      const state = manager.getState();
      
      expect(state.attempts).toBe(0);
      expect(state.isRecovering).toBe(false);
      expect(state.lastError).toBeUndefined();
      expect(state.partialContent).toBeUndefined();
    });
  });
});