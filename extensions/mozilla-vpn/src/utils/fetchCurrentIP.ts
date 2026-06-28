// src/utils/fetchCurrentIP.ts
import https from 'https';
import http from 'http';

interface GeolocationResponse {
  query: string; // IP address
  country: string;
  city: string;
  status: string;
  message?: string;
}

// Function to fetch data with retry capability
const fetchWithRetry = (
  url: string,
  isHttps = true,
  maxRetries = 3
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const makeRequest = () => {
      const httpModule = isHttps ? https : http;

      const req = httpModule.get(url, { timeout: 8000 }, (res) => {
        let data = '';

        // Set a timeout on the response object too
        res.setTimeout(8000, () => {
          req.destroy();
          if (retries < maxRetries) {
            retries++;
            console.log(
              `Response timed out. Retrying ${retries}/${maxRetries}...`
            );
            setTimeout(makeRequest, 1500); // Increased wait time between retries
          } else {
            reject(new Error('Response timed out after multiple attempts'));
          }
        });

        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          // Check if we got a valid response
          if (
            res.statusCode &&
            (res.statusCode < 200 || res.statusCode >= 300)
          ) {
            const error = new Error(`HTTP error ${res.statusCode}`);
            if (retries < maxRetries) {
              retries++;
              console.log(
                `Retry ${retries}/${maxRetries} after HTTP error ${res.statusCode}`
              );
              setTimeout(makeRequest, 1500); // Increased wait time
            } else {
              reject(error);
            }
            return;
          }

          try {
            resolve(data);
          } catch (error) {
            console.error('Failed to parse response:', error);
            reject(new Error('Failed to parse response'));
          }
        });
      });

      req.on('error', (error) => {
        console.error(
          `Request error (attempt ${retries + 1}/${maxRetries + 1}):`,
          error
        );
        req.destroy(); // Ensure the request is destroyed

        if (retries < maxRetries) {
          retries++;
          console.log(`Retrying ${retries}/${maxRetries}...`);
          setTimeout(makeRequest, 1500); // Increased wait time
        } else {
          reject(error);
        }
      });

      // Set a timeout for the request
      req.setTimeout(8000, () => {
        req.destroy();
        if (retries < maxRetries) {
          retries++;
          console.log(
            `Request timed out. Retrying ${retries}/${maxRetries}...`
          );
          setTimeout(makeRequest, 1500); // Increased wait time
        } else {
          reject(new Error('Request timed out after multiple attempts'));
        }
      });
    };

    makeRequest();
  });
};

export async function fetchCurrentIP(): Promise<string> {
  // First, try to get the external IP address using primary service
  try {
    const ipData = await fetchWithRetry(
      'https://api.ipify.org?format=json',
      true
    );
    const ipResult = JSON.parse(ipData);
    const ip = ipResult.ip;

    // Then fetch the geolocation data for the IP
    try {
      const geoData = await fetchWithRetry(
        `http://ip-api.com/json/${ip}`,
        false
      );
      const result: GeolocationResponse = JSON.parse(geoData);

      if (result.status === 'success') {
        return `${result.query} - ${result.city}, ${result.country}`;
      } else {
        console.error('Failed to fetch geolocation:', result.message);
        return `${ip} - Location unavailable`;
      }
    } catch (geoError) {
      console.error('Error fetching geolocation:', geoError);
      return `${ip} - Location unavailable`;
    }
  } catch (ipError) {
    console.error('Error fetching IP address:', ipError);

    // Try an alternative IP service as fallback
    try {
      const ipData = await fetchWithRetry(
        'https://api.ipify.org?format=text',
        true
      );
      return `${ipData.trim()} - Location unavailable`;
    } catch (fallbackError) {
      console.error('Fallback IP lookup failed:', fallbackError);
      return 'IP information unavailable';
    }
  }
}
