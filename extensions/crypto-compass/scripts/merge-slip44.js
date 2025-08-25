const fs = require('fs');
const https = require('https');

console.log('Downloading official SLIP-0044 data...');

// Download official SLIP-0044 data
https.get('https://raw.githubusercontent.com/MetaMask/slip44/main/slip44.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const official = JSON.parse(data);
      const enhancedPath = 'src/slip44-complete.json';
      const enhanced = JSON.parse(fs.readFileSync(enhancedPath, 'utf8'));
      
      console.log(`Official entries: ${Object.keys(official).length}`);
      console.log(`Enhanced entries: ${Object.keys(enhanced).length}`);
      
      // Merge official data with enhanced data (enhanced takes priority)
      const merged = { ...official, ...enhanced };
      
      // Add enhanced metadata to all entries
      Object.keys(merged).forEach(key => {
        const entry = merged[key];
        
        // Add decimals if missing
        if (!entry.decimals) {
          if (entry.symbol === 'BTC' || (entry.name && entry.name.toLowerCase().includes('bitcoin'))) {
            entry.decimals = 8;
          } else if (entry.symbol === 'ETH' || (entry.name && entry.name.toLowerCase().includes('ethereum'))) {
            entry.decimals = 18;
          } else if (entry.symbol === 'TRX' || (entry.name && entry.name.toLowerCase().includes('tron'))) {
            entry.decimals = 6;
          } else if (entry.symbol === 'SOL' || (entry.name && entry.name.toLowerCase().includes('solana'))) {
            entry.decimals = 9;
          } else if (entry.symbol === 'ATOM' || (entry.name && entry.name.toLowerCase().includes('cosmos'))) {
            entry.decimals = 6;
          } else if (entry.name && entry.name.toLowerCase().includes('testnet')) {
            entry.decimals = 18;
          } else {
            entry.decimals = 18; // Default for most modern chains
          }
        }
        
        // Add network type if missing
        if (!entry.networkType) {
          entry.networkType = entry.name && entry.name.toLowerCase().includes('testnet') ? 'testnet' : 'mainnet';
        }
        
        // Add aliases if missing
        if (!entry.aliases) {
          entry.aliases = [];
          if (entry.symbol && entry.symbol.toLowerCase() !== (entry.name || '').toLowerCase()) {
            entry.aliases.push(entry.symbol.toLowerCase());
          }
          if (entry.name) {
            entry.aliases.push(entry.name.toLowerCase());
          }
        }
        
        // Add token standards for popular chains
        if (!entry.tokenStandards) {
          if (entry.symbol === 'ETH' || (entry.name && entry.name.toLowerCase().includes('ethereum'))) {
            entry.tokenStandards = ['ERC-20', 'ERC-721', 'ERC-1155'];
          } else if (entry.symbol === 'BNB' || (entry.name && entry.name.toLowerCase().includes('binance'))) {
            entry.tokenStandards = ['BEP-20', 'BEP-721'];
          } else if (entry.symbol === 'TRX' || (entry.name && entry.name.toLowerCase().includes('tron'))) {
            entry.tokenStandards = ['TRC-20', 'TRC-721', 'TRC-10'];
          } else if (entry.symbol === 'SOL' || (entry.name && entry.name.toLowerCase().includes('solana'))) {
            entry.tokenStandards = ['SPL Token', 'SPL NFT'];
          } else if (entry.symbol === 'MATIC' || (entry.name && entry.name.toLowerCase().includes('polygon'))) {
            entry.tokenStandards = ['ERC-20', 'ERC-721', 'ERC-1155'];
          }
        }
      });
      
      // Write the merged data
      fs.writeFileSync(enhancedPath, JSON.stringify(merged, null, 2));
      console.log(`✅ Successfully merged ${Object.keys(merged).length} entries`);
      
      // Verify KNC is included
      if (merged['1000']) {
        console.log('✅ KNC entry confirmed:', merged['1000']);
      } else {
        console.log('❌ KNC entry missing');
      }
      
      // Show some statistics
      const mainnetCount = Object.values(merged).filter(e => e.networkType === 'mainnet').length;
      const testnetCount = Object.values(merged).filter(e => e.networkType === 'testnet').length;
      console.log(`📊 Statistics: ${mainnetCount} mainnet, ${testnetCount} testnet entries`);
      
    } catch (error) {
      console.error('❌ Error processing data:', error.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Download error:', err.message);
  console.log('Using existing enhanced data only...');
});
