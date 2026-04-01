import { SignJWT, importPKCS8 } from 'jose';

export interface Env {
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_SERVICE_ID: string;
  APPLE_PRIVATE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Simple CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const countryCode = url.searchParams.get('countryCode');
    const dataSets = url.searchParams.get('dataSets') || 'currentWeather,forecastDaily,forecastHourly,forecastNextHour,weatherAlerts';
    const timezone = url.searchParams.get('timezone') || 'UTC';
    const dailyEnd = url.searchParams.get('dailyEnd');

    if (!lat || !lon) {
      return new Response('Missing lat or lon parameters', { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const token = await generateJWT(env);
      
      const appleUrl = new URL(`https://weatherkit.apple.com/api/v1/weather/en/${lat}/${lon}`);
      appleUrl.searchParams.set('dataSets', dataSets);
      appleUrl.searchParams.set('timezone', timezone);
      if (dailyEnd) appleUrl.searchParams.set('dailyEnd', dailyEnd);
      if (countryCode) appleUrl.searchParams.set('countryCode', countryCode);

      const appleResponse = await fetch(appleUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!appleResponse.ok) {
        return new Response(await appleResponse.text(), { 
          status: appleResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      const data = await appleResponse.json();
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (e: any) {
      return new Response(e.message, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  },
};

async function generateJWT(env: Env): Promise<string> {
  const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICE_ID, APPLE_PRIVATE_KEY } = env;

  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_SERVICE_ID || !APPLE_PRIVATE_KEY) {
    throw new Error("Missing Apple Developer environment variables. Please configure these in Cloudflare.");
  }

  // Format the private key for import (handles raw base64 or PEM)
  const rawKey = APPLE_PRIVATE_KEY.trim().replace(/\\n/g, "\n");
  const hasPemMarkers =
    rawKey.includes("-----BEGIN PRIVATE KEY-----") &&
    rawKey.includes("-----END PRIVATE KEY-----");

  const pem = hasPemMarkers
    ? rawKey
    : [
        "-----BEGIN PRIVATE KEY-----",
        rawKey
          .replace(/\s+/g, "")
          .match(/.{1,64}/g)
          ?.join("\n") ?? "",
        "-----END PRIVATE KEY-----",
      ].join("\n");

  const alg = 'ES256';
  const privateKey = await importPKCS8(pem, alg);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg, kid: APPLE_KEY_ID, id: `${APPLE_TEAM_ID}.${APPLE_SERVICE_ID}` })
    .setIssuer(APPLE_TEAM_ID)
    .setIssuedAt()
    .setExpirationTime('1h')
    .setSubject(APPLE_SERVICE_ID)
    .sign(privateKey);

  return jwt;
}
