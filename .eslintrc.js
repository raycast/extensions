module.exports = {
  extends: ["@raycast/eslint-config"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    // Enforce consistent quotes for strings
    "quotes": ["error", "double"],
    
    // Ensure proper handling of Promise rejections in async functions
    "no-promise-executor-return": "error",
    
    // Prevent usage of var (use let/const instead)
    "no-var": "error",
    
    // Enforce consistent spacing in object literals
    "object-curly-spacing": ["error", "always"],
    
    // Specific rules for RSS feed handling
    "no-unused-vars": ["error", { 
      "varsIgnorePattern": "Parser|NewsItem|CacheData",
      "argsIgnorePattern": "^_"
    }]
  },
}; 