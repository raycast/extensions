import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const tokenMatch = envContent.match(/Voicenotes_key=(.*)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

if (!token) {
  console.error("No token found in .env");
  process.exit(1);
}

const BASE_URL = "https://api.voicenotes.com/api/integrations/obsidian-sync";

async function testApi() {
  console.log("Testing Voicenotes API...");

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-API-KEY": token,
    "Content-Type": "application/json",
  };

  // 1. Get User Info
  try {
    const userRes = await fetch(`${BASE_URL}/user/info`, { headers });
    if (!userRes.ok)
      throw new Error(
        `User info failed: ${userRes.status} ${userRes.statusText}`,
      );
    const userData = await userRes.json();
    console.log("User Info:", userData);
  } catch (error) {
    console.error("Error fetching user info:", error);
  }

  // 2. Get Recordings (POST)
  try {
    const recordingsRes = await fetch(`${BASE_URL}/recordings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        last_synced_note_updated_at: undefined,
        obsidian_deleted_recording_ids: [],
      }),
    });

    if (!recordingsRes.ok) {
      const text = await recordingsRes.text();
      throw new Error(
        `Recordings failed: ${recordingsRes.status} ${recordingsRes.statusText} - ${text}`,
      );
    }

    const recordingsData = await recordingsRes.json();
    console.log(`Fetched ${recordingsData.data.length} recordings.`);
    if (recordingsData.data.length > 0) {
      console.log("Latest recording title:", recordingsData.data[0].title);
    }
  } catch (error) {
    console.error("Error fetching recordings:", error);
  }
}

testApi();
