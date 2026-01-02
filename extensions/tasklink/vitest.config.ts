import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, './src/tests/raycast_api_mock.ts'),
    },
  },
});
