const axios = require('axios');

// AnkiConnect URL
const ANKI_CONNECT_URL = "http://localhost:8765";

// Function to test connection to AnkiConnect with retries
async function testAnkiConnection() {
  console.log("Testing connection to Anki with retries...");
  
  try {
    // First check if Anki is running
    console.log("Checking if Anki is running...");
    const isRunning = await isAnkiRunning();
    console.log(`Anki is running: ${isRunning}`);
    
    if (!isRunning) {
      console.error("Anki is not running. Please open Anki and try again.");
      return;
    }
    
    // Test version with retries
    console.log("\nChecking AnkiConnect version with retries...");
    const maxAttempts = 3;
    let versionResponse = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);
      
      try {
        versionResponse = await request("version", {}, 6, 5000);
        
        if (!versionResponse.error) {
          console.log(`AnkiConnect version: ${versionResponse.result}`);
          break;
        } else {
          console.error(`Error: ${versionResponse.error}`);
          
          if (attempt < maxAttempts) {
            console.log(`Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt}: ${error.message}`);
        
        if (attempt < maxAttempts) {
          console.log(`Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!versionResponse || versionResponse.error) {
      console.error("Failed to get AnkiConnect version after multiple attempts.");
      console.log("\nTroubleshooting tips:");
      console.log("1. Make sure Anki is open");
      console.log("2. Verify AnkiConnect is installed (Tools > Add-ons > Check for 'AnkiConnect')");
      console.log("3. Try restarting Anki");
      console.log("4. Check if any firewall is blocking the connection");
      return;
    }
    
    // Get decks with retries
    console.log("\nGetting available decks...");
    let decksResponse = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);
      
      try {
        decksResponse = await request("deckNames", {}, 6, 5000);
        
        if (!decksResponse.error) {
          console.log(`Found ${decksResponse.result.length} decks:`);
          decksResponse.result.forEach(deck => console.log(`- ${deck}`));
          break;
        } else {
          console.error(`Error getting decks: ${decksResponse.error}`);
          
          if (attempt < maxAttempts) {
            console.log(`Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt}: ${error.message}`);
        
        if (attempt < maxAttempts) {
          console.log(`Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!decksResponse || decksResponse.error) {
      console.error("Failed to get decks after multiple attempts.");
      return;
    }
    
    // Get models with retries
    console.log("\nGetting available note types (models)...");
    let modelsResponse = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);
      
      try {
        modelsResponse = await request("modelNames", {}, 6, 5000);
        
        if (!modelsResponse.error) {
          console.log(`Found ${modelsResponse.result.length} models:`);
          modelsResponse.result.forEach(model => console.log(`- ${model}`));
          break;
        } else {
          console.error(`Error getting models: ${modelsResponse.error}`);
          
          if (attempt < maxAttempts) {
            console.log(`Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt}: ${error.message}`);
        
        if (attempt < maxAttempts) {
          console.log(`Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!modelsResponse || modelsResponse.error) {
      console.error("Failed to get models after multiple attempts.");
      return;
    }
    
    console.log("\nConnection test completed successfully!");
  } catch (error) {
    console.error("Error testing connection:", error.message);
  }
}

// Function to check if Anki is running
async function isAnkiRunning() {
  try {
    // Try a POST request first (more reliable)
    try {
      await axios.post(
        ANKI_CONNECT_URL,
        { action: "version", version: 6 },
        { 
          headers: { "Content-Type": "application/json" },
          timeout: 2000
        }
      );
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return false;
      }
      
      // If we get ECONNRESET, Anki might be running but AnkiConnect is not responding properly
      if (error.code === 'ECONNRESET') {
        // Try a GET request as fallback
        try {
          const response = await axios.get(ANKI_CONNECT_URL, { timeout: 2000 });
          return response.status === 200;
        } catch (getError) {
          // If both methods fail, Anki might be running but AnkiConnect is not working properly
          // We'll return true and let the main test function handle the details
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking if Anki is running:", error.message);
    return false;
  }
}

// Function to send requests to AnkiConnect with timeout
async function request(action, params = {}, version = 6, timeout = 5000) {
  try {
    const response = await axios.post(
      ANKI_CONNECT_URL,
      {
        action,
        params,
        version
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: timeout
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { error: "Connection refused. Make sure Anki is running and AnkiConnect is installed." };
    }
    if (error.code === 'ECONNRESET') {
      return { error: "Connection reset. Anki may be running but AnkiConnect is not responding properly. Try restarting Anki." };
    }
    if (error.message.includes('timeout')) {
      return { error: "Request timed out. Anki may be busy or not responding." };
    }
    return { error: error.message };
  }
}

// Run the test
testAnkiConnection();
