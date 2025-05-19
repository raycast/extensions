import { vi } from 'vitest'

// Mock child_process
vi.mock('child_process', () => {
  const mockExec = vi.fn()
  return {
    exec: mockExec,
    default: { exec: mockExec }
  }
})

// Mock util
vi.mock('util', () => {
  const mockPromisify = vi.fn((fn) => {
    // Return a promisified version of the function
    return (...args: any[]) => {
      return new Promise((resolve, reject) => {
        const callback = (error: Error | null, stdout?: string, stderr?: string) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        }
        // Call the original function with all args plus our callback
        fn(...args, callback)
      })
    }
  })
  
  return {
    promisify: mockPromisify,
    default: { promisify: mockPromisify }
  }
})