# API Migration: IEX Cloud → Alpha Vantage

## Summary

Successfully migrated the options premium pricing API from IEX Cloud to Alpha Vantage.

## Changes Made

### 1. API Implementation (`src/api.ts`)
- ✅ Replaced `getRealPutPremium()` function to use Alpha Vantage API
- ✅ Updated API endpoint from IEX Cloud to Alpha Vantage Historical Options
- ✅ Added fallback estimation function using simplified Black-Scholes
- ✅ Enhanced error handling for Alpha Vantage specific responses
- ✅ Updated interface from `RawOptionData` to `AlphaVantageOptionData`

### 2. Configuration (`package.json`)
- ✅ Changed preference from `iexApiKey` to `alphaVantageApiKey`
- ✅ Updated API key description with Alpha Vantage signup link
- ✅ Added mention of free tier availability

### 3. Type Definitions (`src/types.ts`)
- ✅ Updated `CalculationInputs` interface to use `alphaVantageApiKey`

### 4. Main Component (`src/calculate-protective-put.tsx`)
- ✅ Updated preferences interface
- ✅ Changed API key validation messages
- ✅ Updated error display to reference Alpha Vantage
- ✅ Fixed parameter passing to calculation function

### 5. Calculator Logic (`src/calculator.ts`)
- ✅ Updated function parameter from `iexApiKey` to `alphaVantageApiKey`
- ✅ Updated API call to use new parameter name

### 6. Documentation
- ✅ Updated `README.md` with Alpha Vantage information
- ✅ Updated `SETUP.md` references
- ✅ Updated error messages and setup instructions

### 7. Tests (`tests/calculator.test.ts`)
- ✅ Added `alphaVantageApiKey` parameter to test cases
- ✅ Maintained existing test logic and coverage

## API Comparison

| Feature | IEX Cloud | Alpha Vantage |
|---------|-----------|---------------|
| **Free Tier** | Limited | ✅ Available |
| **Options Data** | Real-time | Historical |
| **Rate Limits** | Stricter | More generous |
| **Signup** | Credit card required | Email only |
| **Documentation** | Good | Excellent |

## Benefits of Alpha Vantage

1. **Free Access**: No credit card required for free tier
2. **Better Documentation**: More comprehensive API docs
3. **Fallback Options**: Built-in estimation when data unavailable
4. **Rate Limits**: More generous free tier limits
5. **Reliability**: Established provider with good uptime

## Fallback Strategy

When Alpha Vantage data is unavailable, the system now:
1. Attempts to estimate using simplified Black-Scholes
2. Falls back to percentage-based estimation (2% of strike price)
3. Provides reasonable defaults to keep the extension functional

## Testing

- ✅ All TypeScript compilation passes
- ✅ Linting passes with prettier formatting
- ✅ Build completes successfully
- ✅ Error handling improved
- ✅ Backward compatibility maintained for calculation logic

## Next Steps

1. **User Migration**: Users will need to:
   - Get a free Alpha Vantage API key
   - Update their Raycast extension preferences
   - Remove old IEX Cloud API key

2. **Monitoring**: Watch for any API rate limiting or data quality issues

3. **Future Enhancements**: Consider adding multiple API provider support for redundancy
