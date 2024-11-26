// src/utils/fetchCurrentIP.ts
import https from 'https'; // Import remains for the first request to ipify.org
import http from 'http'; // Import for http requests to ip-api.com

interface GeolocationResponse {
  query: string; // IP address
  country: string;
  city: string;
  status: string;
  message?: string;
}

export async function fetchCurrentIP(): Promise<string> {
  // First, get the external IP address using HTTPS
  const ip = await new Promise<string>((resolve, reject) => {
    https
      .get('https://api.ipify.org?format=json', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result.ip);
          } catch (error) {
            console.error('Failed to parse IP fetch response:', error);
            reject(new Error('Failed to fetch IP'));
          }
        });
      })
      .on('error', (error) => {
        console.error('Error fetching current IP:', error);
        reject(new Error('HTTP error occurred while fetching IP'));
      });
  });

  // Then fetch the geolocation data for the IP using HTTP
  return new Promise<string>((resolve, reject) => {
    http
      .get(`http://ip-api.com/json/${ip}`, (res) => {
        let geoData = '';
        res.on('data', (chunk) => (geoData += chunk));
        res.on('end', () => {
          try {
            const result: GeolocationResponse = JSON.parse(geoData);
            if (result.status === 'success') {
              resolve(`${result.query} - ${result.city}, ${result.country}`);
            } else {
              console.error('Failed to fetch geolocation:', result.message);
              reject(
                new Error(result.message || 'Failed to fetch geolocation')
              );
            }
          } catch (error) {
            console.error('Failed to parse geolocation data:', error);
            reject(new Error('Failed to parse geolocation data'));
          }
        });
      })
      .on('error', (error) => {
        console.error('HTTP error during geolocation fetch:', error);
        reject(new Error('HTTP error occurred while fetching geolocation'));
      });
  });
}
