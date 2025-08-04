// Copyright © 2025
// All rights reserved.

module.exports = {
  extends: ["@raycast/eslint-config"],
  rules: {
    // Disable strict React type checking for now
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "react/jsx-key": "off"
  }
}; 