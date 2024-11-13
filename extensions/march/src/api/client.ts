import { getPreferenceValues } from "@raycast/api";
import https from "https";

const API_HOST = "sage.march.cat";

interface MarchError {
  message: string;
  code?: string;
}

export async function createInboxItem(title: string, notes?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const preferences = getPreferenceValues<{ accessToken: string }>();
    
    const data = JSON.stringify({
      title,
      notes,
    });

    const options = {
      hostname: API_HOST,
      path: '/api/inbox/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${preferences.accessToken}`,
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Failed to create item: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
} 