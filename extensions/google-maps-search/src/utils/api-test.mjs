#!/usr/bin/env node

/**
 * Google Maps API Test Tool
 * This script tests the four main Google Maps APIs needed for the extension:
 * - Places API
 * - Geocoding API
 * - Maps Static API
 * - Maps JavaScript API
 */

import https from "https";
import { URL } from "url";

// Get API key from command line
const apiKey = process.argv[2];
if (!apiKey) {
  console.error("Please provide your Google API key as an argument");
  console.log("Usage: node api-test.js YOUR_API_KEY");
  process.exit(1);
}

// Test endpoints for each API
const API_TESTS = [
  {
    name: "Places API",
    description: "Search for places near a location",
    endpoint: "https://maps.googleapis.com/maps/api/place/textsearch/json",
    params: { query: "pizza", location: "37.7749,-122.4194", radius: "1000" },
    method: "GET",
    testDataField: "results",
  },
  {
    name: "Geocoding API",
    description: "Convert an address to coordinates",
    endpoint: "https://maps.googleapis.com/maps/api/geocode/json",
    params: { address: "1600 Amphitheatre Parkway, Mountain View, CA" },
    method: "GET",
    testDataField: "results",
  },
  {
    name: "Maps Static API",
    description: "Generate a static map image",
    endpoint: "https://maps.googleapis.com/maps/api/staticmap",
    params: { center: "37.7749,-122.4194", zoom: "13", size: "400x400", scale: "2" },
    method: "GET",
    testResponseType: "image",
    isImage: true,
  },
  {
    name: "Maps JavaScript API",
    description: "Check if the Maps JavaScript API is enabled",
    endpoint: "https://maps.googleapis.com/maps/api/js",
    params: { v: "weekly", libraries: "places" },
    method: "GET",
    testResponseStatus: 200,
  },
  {
    name: "Places API (findplacefromtext)",
    description: "Find a place by text",
    endpoint: "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
    params: { input: "Statue of Liberty", inputtype: "textquery", fields: "name,place_id,formatted_address" },
    method: "GET",
    testDataField: "candidates",
  },
];

// Helper function to make HTTP requests
function makeRequest(url, method, isImage = false) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method }, (res) => {
      const statusCode = res.statusCode;

      if (isImage) {
        // For images, just check status code
        if (statusCode === 200) {
          resolve({ status: statusCode, imageReceived: true });
        } else {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const parsedData = JSON.parse(data);
              resolve({ status: statusCode, data: parsedData });
            } catch (e) {
              resolve({ status: statusCode, error: data });
            }
          });
        }
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: statusCode, error: data });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

// Build URL with parameters
function buildUrl(endpoint, params, apiKey) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  url.searchParams.append("key", apiKey);
  return url.toString();
}

// Main function to test all APIs
async function testApis(apiKey) {
  console.log("🔍 Testing Google Maps APIs with your key...\n");

  for (const test of API_TESTS) {
    try {
      console.log(`Testing ${test.name}...`);
      console.log(`Description: ${test.description}`);

      const url = buildUrl(test.endpoint, test.params, apiKey);
      const response = await makeRequest(url, test.method, test.isImage);

      if (response.status === 200) {
        if (test.isImage && response.imageReceived) {
          console.log(`✅ ${test.name} is working! Received image data successfully.`);
        } else if (test.testDataField && response.data[test.testDataField]) {
          const results = response.data[test.testDataField];
          const count = Array.isArray(results) ? results.length : "valid data";
          console.log(`✅ ${test.name} is working! Received ${count} results.`);

          // Show a sample of the data
          if (Array.isArray(results) && results.length > 0) {
            const sample = results[0];
            console.log(`   Sample result: ${JSON.stringify(sample, null, 2).substring(0, 200)}...`);
          }
        } else if (test.testResponseStatus && response.status === test.testResponseStatus) {
          console.log(`✅ ${test.name} is working! Status code: ${response.status}`);
        } else {
          console.log(`✅ ${test.name} appears to be working. Status code: ${response.status}`);
        }
      } else if (response.status === 403) {
        console.log(
          `❌ ${test.name} returned status 403 (Forbidden). This API is not enabled for your project or your API key doesn't have access.`
        );
        if (response.data && response.data.error_message) {
          console.log(`   Error message: ${response.data.error_message}`);
        }
      } else {
        console.log(`❌ ${test.name} returned status ${response.status}`);
        if (response.data && response.data.error_message) {
          console.log(`   Error message: ${response.data.error_message}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error testing ${test.name}: ${error.message}`);
    }

    console.log(""); // Add line between tests
  }

  console.log("\n📝 Summary:");
  console.log("If you see 403 errors for any API, you need to enable that API in the Google Cloud Console:");
  console.log("1. Go to https://console.cloud.google.com/apis/library");
  console.log("2. Make sure the correct project is selected");
  console.log("3. Search for and enable each API that showed a 403 error");
  console.log("4. Wait a few minutes for the changes to take effect");

  console.log("\nRecommended APIs to enable:");
  console.log("- Places API: https://console.cloud.google.com/apis/library/places-backend.googleapis.com");
  console.log("- Geocoding API: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com");
  console.log("- Maps Static API: https://console.cloud.google.com/apis/library/static-maps-backend.googleapis.com");
  console.log("- Maps JavaScript API: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com");
}

testApis(apiKey).catch(console.error);
