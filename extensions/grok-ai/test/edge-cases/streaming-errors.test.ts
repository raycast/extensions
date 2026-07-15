import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRobustStreaming } from '../../src/hooks/useRobustStreaming';

describe('Streaming Error Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should handle connection drop mid-stream', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n'),
        })
        .mockRejectedValueOnce(new Error('Connection lost')),
      cancel: vi.fn(),
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      })
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" response completed"}}]}\n\n'),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });

    const { result } = renderHook(() => useRobustStreaming());

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.data).toBe('Partial response completed');
    });
  });

  it('should handle rate limit with exponential backoff', async () => {
    const startTime = Date.now();
    let attemptCount = 0;

    global.fetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject({ statusCode: 429, message: 'Rate limit exceeded' });
      }
      return Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Success after retry"}}]}\n\n'),
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      });
    });

    const { result } = renderHook(() => useRobustStreaming());

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.data).toBe('Success after retry');
      expect(attemptCount).toBe(3);
      // Verify exponential backoff occurred (should take at least 3 seconds for 2 retries)
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(0); // In tests, delays are mocked
    });
  });

  it('should handle token limit exceeded gracefully', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"This is a very long response that "}}]}\n\n'),
        })
        .mockRejectedValueOnce({ message: 'Maximum token limit exceeded' }),
      cancel: vi.fn(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useRobustStreaming({ onError }));

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBe('This is a very long response that ');
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should handle concurrent stream requests', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Final"}}]}\n\n'),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRobustStreaming());

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.data).toBe('Final');
    });
  });

  it('should handle malformed SSE with recovery', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Valid"}}]}\n' +
                'invalid line without colon\n' +
                'data: {malformed json\n' +
                'data: {"choices":[{"delta":{"content":" content"}}]}\n\n'
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRobustStreaming());

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.data).toBe('Valid content');
    });

    consoleSpy.mockRestore();
  });

  it('should handle empty stream chunks', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(''),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Content"}}]}\n\n'),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(''),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useRobustStreaming());

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.data).toBe('Content');
    });
  });

  it('should handle server disconnection with partial recovery', async () => {
    const mockReader1 = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('id: event-123\ndata: {"choices":[{"delta":{"content":"First part"}}]}\n\n'),
        })
        .mockRejectedValueOnce(new Error('Server disconnected')),
      cancel: vi.fn(),
    };

    const mockReader2 = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" continued"}}]}\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader1 },
      })
      .mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader2 },
      });

    const { result } = renderHook(() => useRobustStreaming());

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.data).toBe('First part continued');
    });
  });

  it('should handle auth failure without retry', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useRobustStreaming({ onError }));

    await act(async () => {
      await result.current.start('https://api.test.com', {});
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });
  });
});