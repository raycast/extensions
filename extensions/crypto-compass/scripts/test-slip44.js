const fs = require('fs');

// Load the data
const slip44Data = JSON.parse(fs.readFileSync('src/slip44-complete.json', 'utf8'));

console.log('🔍 Testing SLIP-0044 Complete Dataset\n');

// Test total count
console.log(`📊 Total entries: ${Object.keys(slip44Data).length}`);

// Test for specific missing coins mentioned
const testCoins = [
  { symbol: 'KNC', name: 'Kyber Network Crystal' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'COMP', name: 'Compound' },
  { symbol: 'SUSHI', name: 'SushiSwap' }
];

console.log('\n🪙 Testing for specific coins:');
testCoins.forEach(coin => {
  const found = Object.values(slip44Data).find(entry => 
    entry.symbol === coin.symbol || 
    entry.name.toLowerCase().includes(coin.name.toLowerCase().split(' ')[0])
  );
  
  if (found) {
    console.log(`✅ ${coin.symbol} (${coin.name}): Found - Coin Type: ${found.index}`);
  } else {
    console.log(`❌ ${coin.symbol} (${coin.name}): NOT FOUND`);
  }
});

// Test network types
const mainnetCount = Object.values(slip44Data).filter(e => e.networkType === 'mainnet').length;
const testnetCount = Object.values(slip44Data).filter(e => e.networkType === 'testnet').length;
console.log(`\n🌐 Network distribution: ${mainnetCount} mainnet, ${testnetCount} testnet`);

// Test decimals coverage
const withDecimals = Object.values(slip44Data).filter(e => e.decimals).length;
console.log(`🔢 Entries with decimals: ${withDecimals}/${Object.keys(slip44Data).length}`);

// Test token standards coverage
const withTokenStandards = Object.values(slip44Data).filter(e => e.tokenStandards && e.tokenStandards.length > 0).length;
console.log(`🏷️  Entries with token standards: ${withTokenStandards}/${Object.keys(slip44Data).length}`);

// Show a few sample entries
console.log('\n📋 Sample entries:');
['0', '60', '1000'].forEach(key => {
  if (slip44Data[key]) {
    const entry = slip44Data[key];
    console.log(`  ${key}: ${entry.symbol || 'N/A'} - ${entry.name} (${entry.decimals}d, ${entry.networkType})`);
  }
});

console.log('\n✅ Test completed successfully!');
