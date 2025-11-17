# Comprehensive Testing Guide

## 🎯 Testing Strategy Overview

This extension uses a **hybrid testing approach** optimized for both development efficiency and CI/CD reliability:

- **GitHub Actions CI/CD**: Uses pre-recorded mock data (no authentication required)
- **Local Development**: Uses real INPI API with automatic credential detection
- **Performance Monitoring**: Comprehensive metrics and health checks built-in

## 🚀 Quick Testing Commands

### Development Testing (Fast)
```bash
# Unit tests (core business logic, no network)
npm run test:unit

# Integration tests with mocked data (CI/CD compatible)
npm run test:integration

# Performance benchmarks (greffe lookup, formatting)
npm run test:performance

# Complete test suite (all tests with mocked data)
npm run test:full
```

### Local Testing with Real API
```bash
# Tests with real INPI API (automatic credential detection)
npm run test:integration:real

# Or with explicit environment variables
INPI_USERNAME=your_user INPI_PASSWORD=your_pass npm run test:integration:real
```

## 🏠 Local Development Setup

### Automatic Credential Detection

Tests automatically try to use your INPI credentials in this priority order:

1. **Environment Variables** (highest priority)
   ```bash
   export INPI_USERNAME="your_username"
   export INPI_PASSWORD="your_password"
   ```

2. **Raycast Preferences** (automatic fallback)
   - Tests automatically read stored Raycast extension preferences
   - No additional configuration needed if extension is already configured

3. **Mocked Data** (final fallback)
   - Uses `assets/mocked-api-responses.json` when no credentials available
   - Comprehensive coverage with 10 different company types

### Running Real API Tests

```bash
# Option 1: Use your existing Raycast configuration (recommended)
npm run test:integration:real

# Option 2: Override with environment variables
INPI_USERNAME=your_user INPI_PASSWORD=your_pass npm run test:integration:real

# Option 3: Complete validation suite
npm run test:full
```

## 🎭 CI/CD Testing (GitHub Actions)

### Automated Pipeline

GitHub Actions runs tests automatically without requiring INPI credentials:

```yaml
# Fast unit tests (every push)
test-unit: ~0.4s

# Mocked integration tests (PRs and main branch) 
test-integration: ~2.9s

# Performance tests (on-demand with [perf] tag)
test-performance: ~0.3s

# Lint and format check (every push)
lint: ~5s
```

### Mock Data System

CI/CD tests use comprehensive pre-recorded data:
- **10 real companies** covering all entity types (SA, SARL, SAS, Auto-entrepreneur, SCI, etc.)
- **Complete API structure validation** for both PersonneMorale and PersonnePhysique
- **Performance benchmarks** with realistic data sizes

## 📊 Test Coverage & Performance

### Test Suite Breakdown

| **Test Type** | **Count** | **Duration** | **Coverage** |
|---------------|-----------|--------------|--------------|
| Unit Tests | 56 | ~0.4s | Core business logic |
| Integration Tests (Mocked) | 25 | ~2.9s | End-to-end workflows |
| Performance Tests | 6 | ~0.3s | Speed & memory benchmarks |
| **Total** | **87** | **~3.6s** | **Complete functionality** |

### Performance Targets

| **Metric** | **Target** | **Critical** |
|------------|------------|---------------|
| Average API response | < 3s | > 5s |
| P95 response time | < 5s | > 8s |
| Success rate | > 95% | < 90% |
| Greffe lookup | < 10ms | > 50ms |
| Cache hit rate | > 80% | < 50% |

## 🔧 Built-in Monitoring & Diagnostics

### Performance Monitoring

The extension includes comprehensive performance monitoring:

```typescript
import { PerformanceMonitor, metrics } from './src/services/metrics';

// Check system health
const isHealthy = PerformanceMonitor.isHealthy();
const healthStatus = PerformanceMonitor.getHealthStatus();

// Generate detailed performance report
const report = PerformanceMonitor.generateReport(3600000); // 1 hour
console.log(report);

// Get endpoint-specific statistics
const loginStats = metrics.getEndpointStats('/api/sso/login');
const companyStats = metrics.getEndpointStats('/api/companies/123456789');
```

### API Structure Validation

Built-in validation ensures API compatibility:

```typescript
import { validateCompanyDataStructure, detectApiChanges } from './src/services/api-validation';

// Validate API response structure
const validation = validateCompanyDataStructure(apiResponse);
if (!validation.valid) {
  console.error('Structure errors:', validation.errors);
  console.warn('Missing fields:', validation.missingFields);
}

// Detect API changes vs baseline
const changes = detectApiChanges(currentResponse, baselineResponse);
if (changes.riskLevel === 'high') {
  console.error('Critical API changes detected:', changes.removedFields);
}
```

## 🐛 Troubleshooting Common Issues

### Authentication Problems

#### ❌ "Authentication failed: Invalid INPI credentials"

**Diagnostic Steps:**
1. Check credentials in Raycast Preferences → Extensions → French Company Search
2. Test login directly on [data.inpi.fr](https://data.inpi.fr)
3. Verify your account has API access approved

**Solutions:**
```bash
# Clear authentication cache if corrupted
# In development environment:
import { clearCache } from './src/services/inpi-api';
clearCache();
```

#### ❌ "Rate limit exceeded"

**Check Current Usage:**
```typescript
const stats = metrics.getStats(300000); // 5 minutes
console.log(`Recent requests: ${stats.totalRequests}`);
console.log(`Success rate: ${stats.successRate}%`);
```

**Solutions:**
1. Wait 1-2 minutes (automatic retry will handle)
2. System automatically limits to 30 requests/minute
3. Check for excessive concurrent searches

### Performance Issues

#### ❌ Response time > 5 seconds

**Diagnostic:**
```typescript
const report = PerformanceMonitor.generateReport();
console.log(report);

// Check P95/P99 metrics
const stats = metrics.getStats();
console.log(`P95: ${stats.p95ResponseTime}ms`);
console.log(`P99: ${stats.p99ResponseTime}ms`);
```

**Health Status Indicators:**
- ✅ **Healthy:** Avg < 3s, P95 < 5s, Success > 95%
- ⚠️ **Degraded:** Avg 3-5s, P95 5-8s, Success 90-95%
- ❌ **Critical:** Avg > 5s, P95 > 8s, Success < 90%

### Data Issues

#### ❌ Missing or incomplete company data

**Validation Check:**
```typescript
const validation = validateCompanyDataStructure(response);
validation.warnings.forEach(warning => console.warn(warning));

// Inspect specific data structure
console.log('Powers:', response.formality.content.personneMorale.composition.pouvoirs);
```

**Common Causes:**
1. INPI API format changes (extension supports old/new formats)
2. Incomplete data in INPI database (normal for some companies)
3. Network issues during API call

#### ❌ "No company found for SIREN"

**Validation:**
```typescript
import { validateAndExtractSiren } from './src/utils';
const validation = validateAndExtractSiren(userInput);
console.log('Validated SIREN:', validation);
```

**Solutions:**
1. Verify SIREN exists on [societe.com](https://societe.com)
2. Check format: 9 digits (SIREN) or 14 digits (SIRET)
3. Some inactive companies may not be in current database

### Court Registry (Greffe) Issues

#### ❌ Incorrect or missing court registry

**Test Greffe Lookup:**
```typescript
import { findGreffeByCodePostal } from './src/services/greffe-lookup';

const greffe = findGreffeByCodePostal('75001');
console.log('Found greffe:', greffe);

// Performance test
const startTime = performance.now();
const result = findGreffeByCodePostal('75001');
const elapsed = performance.now() - startTime;
console.log(`Lookup in ${elapsed.toFixed(3)}ms`);
```

**Update Court Registry Data:**
```bash
# If new CSV data available
npm run build-greffes    # Rebuild from CSV source  
npm run compress-greffes # Optimize for performance
npm test                 # Validate accuracy
```

## 📈 Mock Dataset Management

### Generating Fresh Mock Data

```bash
# Navigate to local directory
cd local/

# Run interactive dataset generator (requires INPI credentials)
npx ts-node generate-mock-dataset.ts
```

**What the script does:**
1. **Secure credential prompt** (masked password input)
2. **INPI API authentication** with immediate credential cleanup
3. **Data collection** for 10 diverse company types
4. **Rate limiting compliance** (2s delays between requests)
5. **Save to** `assets/mocked-api-responses.json`

### Mock Dataset Contents

The mock dataset includes:
- **SA (Société Anonyme)**: Large corporation structure
- **SARL**: Limited liability company
- **SAS**: Simplified joint-stock company  
- **Auto-entrepreneur**: Individual entrepreneur
- **SCI**: Real estate company
- **EURL**: Single-member LLC
- **SASU**: Simplified single-member company
- **Association**: Non-profit organization
- **SCOP**: Worker cooperative
- **Holding**: Investment company

## 🔄 Complete Development Workflow

### 1. Local Development Cycle
```bash
# Quick iteration during development
npm run test:unit          # Fast feedback on logic changes
npm run test:integration   # Validate with mocked data
npm run test:performance   # Check no performance regression
```

### 2. Pre-commit Validation
```bash
# Complete local validation before push
cd local/ && npx ts-node generate-mock-dataset.ts  # Refresh if needed
npm run test:integration:real  # Test with real API
npm run test:full             # Complete suite
npm run lint                  # Code quality
```

### 3. CI/CD Pipeline
```bash
# Automatic on push/PR
git add .
git commit -m "feature: new functionality"  
git push origin feature-branch
```

Tests run automatically with mocked data - no credentials required.

## 🛠️ Development Tools

### Debugging Mode

```bash
# Enable detailed logging
npm run dev

# View Raycast logs
tail -f ~/Library/Logs/Raycast/raycast.log

# Debug-specific components
DEBUG=inpi:* npm run dev      # INPI API calls
DEBUG=greffe:* npm run dev    # Court registry lookups
DEBUG=metrics:* npm run dev   # Performance metrics
```

### Environment Variables

```bash
# Testing environment
NODE_ENV=development npm run dev
FORCE_MOCK=true npm test           # Force mock usage
INPI_USERNAME=xxx INPI_PASSWORD=xxx npm run test:integration:real
```

### Performance Profiling

```bash
# Memory usage analysis
npm run test:performance

# API response time analysis  
npm run test:integration:real -- --verbose

# Generate comprehensive performance report
node -e "
const { PerformanceMonitor } = require('./dist/services/metrics');
console.log(PerformanceMonitor.generateReport());
"
```

## 📞 Support & Issue Reporting

### Collecting Diagnostic Information

```typescript
// Performance report
const report = PerformanceMonitor.generateReport();

// Recent errors
const errors = metrics.getRecentErrors(5);

// System health status
const health = PerformanceMonitor.getHealthStatus();

// API validation results
const validation = validateCompanyDataStructure(lastResponse);
```

### GitHub Issue Template

When creating a GitHub issue, include:

1. **Performance Report** (from above)
2. **Recent Errors** with timestamps
3. **Test SIREN** (if applicable)
4. **Expected vs Actual Behavior**
5. **Environment Info** (Node.js version, OS)

### Resources

- **GitHub Issues:** [Create Issue](https://github.com/fma16/french-company-search/issues)
- **Documentation:** [README.md](README.md) | [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Raycast Logs:** `~/Library/Logs/Raycast/raycast.log`
- **INPI API Docs:** [data.inpi.fr](https://data.inpi.fr)

## 🎯 Best Practices

### ✅ Recommended Practices

- **Refresh mock dataset monthly** or when INPI API changes
- **Test locally before push** using real API to catch issues early
- **Configure credentials in Raycast preferences** for seamless testing
- **Respect API rate limits** (2s between calls in scripts)
- **Monitor performance metrics** during development

### ❌ Avoid These Pitfalls

- **Never commit credentials** in code or environment files
- **Don't ignore API structure warnings** - they indicate upcoming breaking changes
- **Don't run real tests without rate limiting** - respect INPI's infrastructure
- **Don't push without local validation** - CI/CD uses mocked data and may miss real API issues

## 📊 Continuous Integration Excellence

### Optimized CI/CD Flow

1. **Fast Unit Tests** (every push) → 0.4s feedback
2. **Mocked Integration Tests** (PRs) → 2.9s full workflow validation  
3. **Performance Tests** (on-demand) → 0.3s performance regression detection
4. **Real API Tests** (local only) → Complete validation before release

### Performance Metrics Dashboard

The built-in monitoring provides:
- **Real-time health status** with automatic alerting
- **Historical performance trends** with configurable timeframes  
- **API change detection** with risk assessment
- **Automatic fallback** to mocked data during API outages

This comprehensive testing strategy ensures **maximum reliability** with **optimal development velocity** and **zero CI/CD external dependencies**.