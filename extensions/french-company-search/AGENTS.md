# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Comments Policy

**IMPORTANT: All code comments must be written in English only.** This ensures international developer accessibility and consistency across the codebase.

- ✅ Use clear, concise English for all inline comments, function documentation, and explanations
- ✅ Document complex business logic, API integrations, and French legal formatting requirements in English
- ✅ Use English for TODO/FIXME comments and technical notes
- ❌ Do not use French comments, even when dealing with French business concepts
- ❌ Avoid mixing languages in documentation or comments

When documenting French legal concepts or API fields, explain them in English:
```typescript
// GOOD: Legal form mapping - "5599" represents "Société anonyme (SA)" in French law
const LEGAL_FORM_SA = "5599";

// BAD: Mapping des codes de forme juridique INPI
const LEGAL_FORM_SA = "5599";
```

## Development Commands

### Core Development
- `npm run dev` - Start development mode with Raycast
- `npm run build` - Build the extension (uses official `ray build`)
- `npm run lint` - Run ESLint (uses official `ray lint`) 
- `npm run fix-lint` - Run ESLint with auto-fix
- `npm run publish` - Publish to Raycast Store

### Testing Commands
- `npm run test` - Run all tests
- `npm run test:unit` - Unit tests (fast, no network)
- `npm run test:integration` - Integration tests with mocked data
- `npm run test:integration:real` - Real API tests with INPI credentials
- `npm run test:performance` - Performance benchmarks
- `npm run test:full` - Complete test suite with coverage

### Pre-Submission Validation
Before submitting to Raycast Store, ensure all validations pass:
```bash
# Complete pre-submission checklist
npm run lint          # Official Raycast linting
npm run build         # Official Raycast build validation  
npm run test:full     # Complete test coverage
```

**Important:** Always use `npm run build` and `npm run lint` (which use official `ray` commands) rather than direct TypeScript compilation. This ensures compatibility with Raycast's exact build environment.

### CI/CD Integration Note
**⚠️ When updating test logic or npm test scripts, always check if `.github/workflows/test.yml` needs to be updated.** The GitHub Actions workflow uses specific npm scripts and folder patterns. After any testing infrastructure changes, verify that:
- All referenced npm scripts still exist and work correctly
- Test path patterns match the current folder structure 
- Workflow commands align with local development commands

### Changelog Guidelines
**📝 When updating CHANGELOG.md, always follow these rules:**
- The **latest version** (most recent release) should always use `{PR_MERGE_DATE}` as the date placeholder
- All **previous versions** should have their actual release dates (e.g., `2025-08-11`)
- This ensures the latest version gets the correct date when the PR is merged
- Use semantic versioning: MAJOR.MINOR.PATCH (e.g., 1.1.0 for feature additions, 1.0.3 for bug fixes)

## Architecture Overview

This is a Raycast extension for fetching French company information from the INPI (Institut National de la Propriété Industrielle) API using SIREN/SIRET numbers. The extension formats company data into standardized legal contract language in French.

### Core Components

**Main Entry Point (`src/index.tsx`)**
- `SearchForm` - Input form for SIREN/SIRET numbers with validation
- `CompanyDetail` - Displays formatted company information with metadata and copy functionality
- `buildMarkdown` - Generates formatted legal text for contract integration
- `Metadata` - Structured display of key company information

**API Layer (`src/lib/inpi-api.ts`)**
- `login()` - Authenticates with INPI API using Bearer token authentication with caching
- `getCompanyInfo()` - Fetches company data by SIREN number with 404 error handling and rate limiting
- Base URL: `https://registre-national-entreprises.inpi.fr`
- Endpoints: `/api/sso/login`, `/api/companies/{siren}`
- Rate limiting: 30 requests/minute with exponential backoff retry

**Data Processing (`src/lib/utils.ts`)**
- `validateAndExtractSiren()` - Validates and extracts SIREN from input (handles both 9-digit SIREN and 14-digit SIRET)
- `formatAddress()` - Constructs French address format from optional fields
- `getGenderAgreement()` - Handles French grammatical gender agreement for legal terms
- `formatField()` - Handles null/undefined values with fallback (`[À COMPLÉTER]`)
- `formatSiren()` - Formats SIREN with non-breaking spaces (784608416 → 784 608 416)
- `formatFrenchNumber()` - Formats numbers with French conventions (9077707050 → 9 077 707 050,00)
- `getLegalFormLabel()` - Maps legal form codes to readable labels (5599 → "Société anonyme (SA)")
- `getRoleName()` - Maps role codes to human-readable French names

**Recursive Representative Search (`src/lib/recursive-representative-search.ts`)**
- `findPhysicalRepresentative()` - Recursively searches for physical person representatives when the legal representative is a holding company
- `extractSirenFromEnterprise()` - Extracts SIREN from enterprise data with multiple field fallbacks
- Supports cascading representation: Company → Holding Company → Physical Person
- Prevents infinite loops with depth limiting and validates SIREN format

**Types (`src/types.ts`)**
- `CompanyData` - Complete INPI API response structure
- `RepresentativeInfo` - Director/manager information with role hierarchy and gender agreement
- `Preferences` - Extension configuration for API credentials
- `AddressInfo` - Structured address data from INPI API
- `PersonDescription` - Individual person details with French grammatical attributes

## INPI API Structure

### Authentication Flow
1. POST `/api/sso/login` with username/password credentials
2. API returns JWT/bearer token
3. Include `Authorization: Bearer {token}` header in subsequent requests

### Company Data Fields

**Core Company Information:**
- `siren` - 9-digit company identifier
- `personneMorale.denomination` - Company name
- `personneMorale.formeJuridique` - Legal form (SARL, SAS, SA, etc.)
- `personneMorale.capital.montant` - Share capital amount

**Registration Details:**
- `personneMorale.immatriculationRcs.numeroRcs` - RCS registration number
- `personneMorale.immatriculationRcs.villeImmatriculation` - RCS registration city

**Address Structure (all optional):**
- `adresseEntreprise.numeroVoie` - Street number
- `adresseEntreprise.typeVoie` - Street type (rue, avenue, etc.)
- `adresseEntreprise.libelleVoie` - Street name
- `adresseEntreprise.codePostal` - Postal code
- `adresseEntreprise.commune` - City/commune

**Management Information:**
- `personneMorale.dirigeants[]` - Array of company representatives
- Representative roles: Président, Gérant, Directeur général (in priority order)
- Gender field for French grammatical agreement: 'M'/'F'

### Error Handling Patterns
- **404**: Company not found for SIREN
- **Authentication errors**: Invalid credentials or expired tokens
- **Missing data**: Graceful degradation with `[À COMPLÉTER]` fallbacks
- **Partial data**: Handle cases where `personneMorale` is missing

### Key Features

- SIREN/SIRET validation and normalization
- Token-based authentication with INPI API (with caching and rate limiting)
- Legal representative identification with role hierarchy and priority (President > General Director for SAS)
- **Recursive representative search**: When legal representative is a holding company, automatically searches for the physical person representative of that holding company
- French legal document formatting with proper grammar and gender agreement
- French number formatting with non-breaking spaces and proper decimal handling
- Complete legal form code mapping (including SA codes 5598/5599)
- Dual entity support: Corporate entities and individual entrepreneurs
- Comprehensive fallback handling for missing data
- Copy-to-clipboard functionality for generated legal text (HTML and plain text)
- RCS city determination from postal code using Datainfogreffe dataset

### Configuration

The extension requires INPI API credentials configured in Raycast preferences:
- `inpiUsername` - INPI API username
- `inpiPassword` - INPI API password (stored securely)

### Output Format

Generates standardized French legal text suitable for contract party designation sections:

**Corporate Entity (Personne Morale):**
```
La société [DENOMINATION]
[FORME JURIDIQUE] au capital de [CAPITAL] €
Immatriculée au RCS de [VILLE] sous le n° [NUMERO_RCS]
Dont le siège social est situé [ADRESSE]
Représentée aux fins des présentes par [REPRESENTANT] en sa qualité de [ROLE], dûment [habilité/habilitée].
```

**Corporate Entity with Holding Company Representative:**
```
La société [DENOMINATION]
[FORME JURIDIQUE] au capital de [CAPITAL] €
Immatriculée au RCS de [VILLE] sous le n° [NUMERO_RCS]
Dont le siège social est situé [ADRESSE]
Représentée aux fins des présentes par la société [NOM SOCIÉTÉ MÈRE] en tant que [RÔLE SOCIÉTÉ MÈRE], elle-même représentée par [NOM REPRÉSENTANT SOCIÉTÉ MÈRE] en tant que [RÔLE REPRÉSENTANT SOCIÉTÉ MÈRE], dûment [habilité/habilitée].
```

**Individual Entrepreneur (Personne Physique):**
```
[Monsieur/Madame] [PRENOM] [NOM]
[Né/Née](e) le [DATE] à [LIEU]
De nationalité [NATIONALITE]
Demeurant [ADRESSE]
N° : [SIREN]
```

**French Formatting Standards:**
- Numbers: Non-breaking spaces as thousand separators (9 077 707 050,00 €)
- SIREN: Non-breaking spaces between digit groups (784 608 416)
- Currency: Non-breaking space before € symbol
- Decimals: Always 2 decimal places with comma separator (675,20)

## Documentation de référence

- **Documentation Raycast :** [https://developers.raycast.com](https://developers.raycast.com/)
- **Documentation technique API RNE :** [https://www.inpi.fr/sites/default/files/2025-06/documentation%20technique%20API%20formalit%C3%A9s_v4.0.pdf](https://www.inpi.fr/sites/default/files/2025-06/documentation%20technique%20API%20formalit%C3%A9s_v4.0.pdf)
- **Dictionnaire des variables :** [https://www.inpi.fr/sites/default/files/2025-06/Dictionnaire_de_donnees_INPI_2025_05_09.xlsx](https://www.inpi.fr/sites/default/files/2025-06/Dictionnaire_de_donnees_INPI_2025_05_09.xlsx)

## Development Notes

- **Language**: All responses and communications should be in French
- **API calls**: Token caching implemented with 10-minute TTL, company data caching with 5-minute TTL
- **Data format**: All data is in French, appropriate for French business registry
- **French formatting**: Use non-breaking spaces (\u00A0) for number formatting and currency
- **Input validation**: Always validate SIREN format before API calls (9 digits numeric)
- **SIRET handling**: Extract first 9 digits as SIREN from 14-digit SIRET numbers
- **Number formatting**: Always use formatFrenchNumber() for capital amounts with exactly 2 decimals
- **Legal forms**: Use getLegalFormLabel() to map codes to readable labels
- **Error handling**: Use showFailureToast() from @raycast/utils for consistent error messaging

## Real Data Integration Tests

### Test Dataset with Real SIREN Numbers

The extension includes a comprehensive test suite using real SIREN numbers to validate functionality with actual INPI API responses:

```typescript
import { REAL_SIREN_TEST_CASES } from './src/__tests__/data/real-siren-dataset';

// 10 real companies covering different legal structures:
// - SA (Société Anonyme): 552032534
// - SARL: 391164217  
// - SAS: 794598813
// - Auto-entrepreneur: 949053854
// - SCI: 879574283
// - EURL: 492605712
// - SASU: 411331580
// - Association loi 1901: 317236248
// - SCOP: 421251067
// - Holding: 314685454
```

**Testing Commands:**
```bash
# Run all integration tests with real API calls
npm run test:real-api

# Test individual SIREN interactively
npx ts-node scripts/test-individual-siren.ts 552032534

# List all available test SIREN numbers
npx ts-node scripts/test-individual-siren.ts
```

**Test Coverage:**
- API data structure validation across different entity types
- Markdown generation with real company data
- Representative name formatting (Prénom NOM format)
- RCS city formatting (Paris vs PARIS)
- Address formatting improvements
- Performance validation with concurrent requests
- Regression testing to ensure no breaking changes

**Rate Limiting Compliance:**
- Tests include 2-second delays between API calls
- Retry logic for temporary failures
- Respects INPI API limits (30 requests/minute)
- Concurrent request testing with proper throttling

## Performance Monitoring and Validation

### Metrics System (`src/lib/metrics.ts`)

The extension includes comprehensive performance monitoring:

```typescript
import { metrics, PerformanceMonitor } from './src/lib/metrics';

// Check system health
const isHealthy = PerformanceMonitor.isHealthy();
const healthStatus = PerformanceMonitor.getHealthStatus();

// Generate performance report  
const report = PerformanceMonitor.generateReport(3600000); // 1 hour
console.log(report);

// Get specific endpoint statistics
const loginStats = metrics.getEndpointStats('/api/sso/login');
const companyStats = metrics.getEndpointStats('/api/companies/123456789');
```

**Performance Targets:**
- API response average: <3s (critical: >5s)
- P95 response time: <5s (critical: >8s)  
- Success rate: >95% (critical: <90%)
- Greffe lookup: <10ms (critical: >50ms)

**Automatic Monitoring:**
- All API calls automatically tracked with response times, status codes, error types
- Health checks with configurable thresholds
- Memory-efficient storage (max 1000 recent metrics)
- Development warnings for slow calls (>5s) or high error rates (<80% success)

### API Structure Validation (`src/lib/api-validation.ts`)

Robust API response validation with change detection:

```typescript
import { validateCompanyDataStructure, detectApiChanges, createApiBaseline } from './src/lib/api-validation';

// Validate API response structure
const validation = validateCompanyDataStructure(response);
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

**Validation Features:**
- PersonneMorale/PersonnePhysique structure validation
- Support for both old and new INPI API representative formats
- Missing field detection with severity levels (errors vs warnings)
- Change detection with risk assessment (low/medium/high)
- Baseline creation for regression testing

### Greffe Data Optimization

**Current Performance (Post-Optimization):**
- File size: 251KB (84% reduction from 1.5MB original)
- Data entries: 6,337 (77% reduction from 28,136 original)  
- Lookup time: <0.01ms average (target: <10ms)
- Compression algorithm: Range-based with binary search O(log n)

**Data Management Scripts:**
```bash
npm run build-greffes    # Rebuild from CSV source
npm run compress-greffes # Optimize existing data
npm test                 # Validate accuracy
```

## Raycast Store Guidelines

When preparing code changes for the Raycast Store, ensure compliance with:

### Technical Requirements
- Use latest Raycast API version (`@raycast/api` and `@raycast/utils`)
- Avoid external dependencies that require user downloads
- No heavy binary dependencies or external analytics
- Maintain async/await patterns for better performance
- Use TypeScript with proper type safety (no `any` types)

### User Experience Standards
- Clear, descriptive titles using Apple Style Guide (Title Case)
- Comprehensive error handling with user-friendly messages
- Proper loading states and empty states
- Use preferences API for configuration
- Maintain consistent UI patterns across commands
- Provide meaningful placeholders in text fields

### Code Quality Standards
- Clean, readable code with proper documentation
- Comprehensive error handling and fallback values
- Efficient API usage with appropriate caching
- Proper logging (development only, no sensitive data)
- Follow Raycast's navigation and action patterns

### Metadata Requirements
- MIT license
- Clear package.json with proper categorization
- High-quality 512x512px icon (light/dark theme compatible)
- Comprehensive README for setup instructions
- Updated CHANGELOG with feature descriptions
- Screenshots (2000x1250px) for store listing

### Performance Considerations
- Minimize API calls through intelligent caching
- Async operations for better user experience
- Efficient data processing and rendering
- Graceful handling of network failures

### Store Submission Checklist
1. Run `npm run build` successfully
2. Run `npm run lint` with no errors
3. Test all commands and edge cases
4. Verify proper error handling
5. Check metadata completeness
6. Ensure icon quality and theme compatibility
7. Update documentation and changelog
8. Test with various input scenarios