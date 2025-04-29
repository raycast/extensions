// This is a placeholder file to satisfy the TypeScript compiler
// It will be removed in a future update

// Mock the shell-env module to satisfy the import
const shellEnv = {
  sync: () => {
    return {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    };
  },
};

export default shellEnv;
