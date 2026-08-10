import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['src/__mocks__/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, 'src/__mocks__/raycast-api.ts'),
    },
  },
});
