import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts']
  },
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, './__mocks__/@raycast/api.ts')
    }
  }
})