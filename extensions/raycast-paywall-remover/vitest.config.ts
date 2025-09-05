import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/utils/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, 'src/utils/__tests__/__mocks__/@raycast/api.ts'),
    },
  },
});