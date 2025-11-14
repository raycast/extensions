#!/usr/bin/env node

/**
 * Generate a Firebase custom token for Raycast authentication
 * Usage: node scripts/generate-token.js <userId>
 */

const admin = require('firebase-admin');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

// Path to service account key (you'll need to download this from Firebase Console)
const SERVICE_ACCOUNT_PATH = join(__dirname, '..', 'serviceAccountKey.json');

// Path to write the custom token
const SHARED_DIR = join(homedir(), 'Library', 'Application Support', 'to-do');
const AUTH_FILE = join(SHARED_DIR, 'raycast-auth.json');

async function generateCustomToken() {
  // Check if service account key exists
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ serviceAccountKey.json not found!');
    console.error('\nTo get your service account key:');
    console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('2. Click "Generate New Private Key"');
    console.error('3. Save it as raycast-extension/serviceAccountKey.json');
    console.error('\n⚠️  Do NOT commit this file to git!');
    process.exit(1);
  }

  // Get userId from command line or auth file
  let userId = process.argv[2];
  
  if (!userId && existsSync(AUTH_FILE)) {
    try {
      const authData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
      userId = authData.userId;
      console.log(`📝 Found userId from existing auth: ${userId}`);
    } catch (error) {
      // Ignore
    }
  }

  if (!userId) {
    console.error('❌ No userId provided!');
    console.error('\nUsage:');
    console.error('  node scripts/generate-token.js <userId>');
    console.error('\nOr run the iOS/macOS app first to generate the auth file.');
    process.exit(1);
  }

  try {
    // Initialize Firebase Admin
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('🔐 Generating custom token...');
    
    // Generate custom token
    const customToken = await admin.auth().createCustomToken(userId);
    
    console.log('✅ Custom token generated successfully!');
    
    // Write to shared auth file
    const authData = {
      userId: userId,
      customToken: customToken,
      timestamp: Date.now()
    };
    
    writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
    console.log(`✅ Token written to: ${AUTH_FILE}`);
    console.log('\n🎉 Raycast extension should now work!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    process.exit(1);
  }
}

generateCustomToken();


