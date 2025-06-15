#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Capture Thought Extension Setup...\n');

let hasErrors = false;

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
    console.log('❌ Node.js version is too old. Requires Node.js 18+. Current:', nodeVersion);
    hasErrors = true;
} else {
    console.log('✅ Node.js version:', nodeVersion);
}

// Check if we're in the right directory (has package.json with correct name)
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (pkg.name === 'capture-thought') {
        console.log('✅ In correct project directory');
    } else {
        console.log('❌ Not in the capture-thought project directory');
        hasErrors = true;
    }
} else {
    console.log('❌ package.json not found. Are you in the project root?');
    hasErrors = true;
}

// Check Raycast extension dependencies
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ Raycast extension dependencies installed');
} else {
    console.log('⚠️  Raycast extension dependencies not installed. Run: npm install');
}

// Check server directory structure
const serverPath = path.join(process.cwd(), 'server');
if (fs.existsSync(serverPath)) {
    console.log('✅ Server directory exists');
    
    // Check server package.json
    const serverPackagePath = path.join(serverPath, 'package.json');
    if (fs.existsSync(serverPackagePath)) {
        console.log('✅ Server package.json exists');
    } else {
        console.log('❌ Server package.json missing');
        hasErrors = true;
    }
    
    // Check server dependencies
    const serverNodeModulesPath = path.join(serverPath, 'node_modules');
    if (fs.existsSync(serverNodeModulesPath)) {
        console.log('✅ Server dependencies installed');
    } else {
        console.log('⚠️  Server dependencies not installed. Run: cd server && npm install');
    }
    
    // Check server source files
    const serverSrcPath = path.join(serverPath, 'src', 'server.ts');
    if (fs.existsSync(serverSrcPath)) {
        console.log('✅ Server source code exists');
    } else {
        console.log('❌ Server source code missing');
        hasErrors = true;
    }
    
    // Check environment configuration
    const envPath = path.join(serverPath, '.env');
    if (fs.existsSync(envPath)) {
        console.log('✅ Server .env file exists');
        
        // Check if .env has required variables
        const envContent = fs.readFileSync(envPath, 'utf8');
        const requiredVars = ['OPENAI_API_KEY', 'NOTION_TOKEN', 'NOTION_DATABASE_ID'];
        const missingVars = [];
        
        for (const varName of requiredVars) {
            if (!envContent.includes(varName + '=') || envContent.includes(varName + '=your_')) {
                missingVars.push(varName);
            }
        }
        
        if (missingVars.length === 0) {
            console.log('✅ All required environment variables configured');
        } else {
            console.log('⚠️  Missing or placeholder environment variables:', missingVars.join(', '));
            console.log('   Update server/.env with your actual API keys');
        }
    } else {
        console.log('⚠️  Server .env file not found. Copy config.example to server/.env');
    }
} else {
    console.log('❌ Server directory missing');
    hasErrors = true;
}

// Check Raycast extension source files
const srcPath = path.join(process.cwd(), 'src');
if (fs.existsSync(srcPath)) {
    console.log('✅ Raycast extension source directory exists');
    
    const requiredFiles = [
        'types.ts',
        'api.ts', 
        'capture-thought.tsx',
        'capture-dictation.tsx',
        'top-work-priorities.tsx',
        'top-life-priorities.tsx',
        'top-priorities-all.tsx'
    ];
    
    const missingFiles = [];
    for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(srcPath, file))) {
            missingFiles.push(file);
        }
    }
    
    if (missingFiles.length === 0) {
        console.log('✅ All Raycast extension source files present');
    } else {
        console.log('❌ Missing Raycast extension files:', missingFiles.join(', '));
        hasErrors = true;
    }
} else {
    console.log('❌ Raycast extension src directory missing');
    hasErrors = true;
}

// Check TypeScript configuration
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
    console.log('✅ TypeScript configuration exists');
} else {
    console.log('❌ TypeScript configuration missing');
    hasErrors = true;
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
    console.log('❌ Setup has errors. Please fix the issues above before proceeding.');
    console.log('\nQuick fixes:');
    console.log('1. Run: npm install (in project root)');
    console.log('2. Run: cd server && npm install');
    console.log('3. Copy: cp config.example server/.env');
    console.log('4. Edit server/.env with your API keys');
    process.exit(1);
} else {
    console.log('🎉 Setup validation completed successfully!');
    console.log('\nReady to start:');
    console.log('• Run: ./start.sh (starts both server and extension)');
    console.log('• Or manually: cd server && npm run dev (then npm run dev in root)');
    console.log('\n🚀 Enjoy capturing your thoughts!');
} 