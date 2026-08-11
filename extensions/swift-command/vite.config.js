import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, '__tests__/mocks/raycast-api.ts'),
    },
  },
  test: {
    globals: true,
  },
});