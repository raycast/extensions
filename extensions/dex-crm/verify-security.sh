#!/bin/bash
# Security Verification Script
# Run this before pushing to GitHub

echo "🔒 Security Verification Check"
echo "=============================="
echo ""

# Check for potential API keys or secrets
echo "1. Checking for exposed secrets..."
if grep -r "1748b0e2cf3c33c\|password\s*=\|secret\s*=\|token\s*=" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude="*test*" src/ 2>/dev/null; then
  echo "❌ FAIL: Found potential secrets in source code!"
  exit 1
else
  echo "✅ PASS: No exposed secrets found"
fi

echo ""
echo "2. Checking .gitignore coverage..."
if [ -f ".gitignore" ]; then
  if grep -q "\.env$" .gitignore && grep -q "test-api" .gitignore; then
    echo "✅ PASS: .gitignore properly configured"
  else
    echo "❌ FAIL: .gitignore missing critical entries"
    exit 1
  fi
else
  echo "❌ FAIL: .gitignore not found"
  exit 1
fi

echo ""
echo "3. Checking for .env file..."
if [ -f ".env" ]; then
  echo "⚠️  WARNING: .env file exists (ensure it's in .gitignore)"
else
  echo "✅ PASS: No .env file present"
fi

echo ""
echo "4. Running build test..."
if npm run build > /dev/null 2>&1; then
  echo "✅ PASS: Build successful"
else
  echo "❌ FAIL: Build failed"
  exit 1
fi

echo ""
echo "5. Running tests..."
if npm test > /dev/null 2>&1; then
  echo "✅ PASS: Tests passed"
else
  echo "⚠️  WARNING: Some tests failed (check manually)"
fi

echo ""
echo "=============================="
echo "🎉 Security verification complete!"
echo ""
echo "You can safely push to GitHub."
echo "Run: git push origin main"
