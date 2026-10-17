import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '*.config.ts',
        '*.config.js',
        'src/ask.tsx',
        'src/history.tsx',
        'src/model.tsx',
        'src/actions/',
        'src/views/',
        'src/hooks/useAutoSaveConversation.tsx',
        'src/hooks/useAutoTTS.tsx',
        'src/hooks/useChat.tsx',
        'src/hooks/useCommand.tsx',
        'src/hooks/useConversations.tsx',
        'src/hooks/useGrokAPI.tsx',
        'src/hooks/useHistory.tsx',
        'src/hooks/useModel.tsx',
        'src/hooks/useQuestion.tsx',
        'src/hooks/useSavedChat.tsx',
        'src/utils/cache.tsx',
        'src/utils/import-export.tsx',
        'src/type.tsx',
      ],
      include: [
        'src/utils/stream-recovery.tsx',
        'src/hooks/useRobustStreaming.tsx',
      ],
      thresholds: {
        lines: 45,
        functions: 90,
        branches: 75,
        statements: 45,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@raycast/api': path.resolve(__dirname, './test/mocks/raycast-api-mock.ts'),
      '@raycast/utils': path.resolve(__dirname, './test/mocks/raycast-utils-mock.ts'),
    },
  },
});