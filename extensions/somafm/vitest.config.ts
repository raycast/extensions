import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, './src/test/mocks/raycast-api.ts'),
      '@raycast/utils': path.resolve(__dirname, './src/test/mocks/raycast-utils.ts'),
    },
  },
});