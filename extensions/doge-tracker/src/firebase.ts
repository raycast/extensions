import fetch from "node-fetch";

interface FirebaseConfig {
  projectId: string;
  appId: string;
  databaseURL: string;
  storageBucket: string;
  authDomain: string;
  messagingSenderId: string;
  measurementId: string;
}

const FIREBASE_CONFIG: FirebaseConfig = {
  projectId: "doge-f70d7",
  appId: "1:5525629265:web:1bd57d45b13c39d9fc4b70",
  databaseURL: "https://doge-f70d7-default-rtdb.firebaseio.com",
  storageBucket: "doge-f70d7.firebasestorage.app",
  authDomain: "doge-f70d7.firebaseapp.com",
  messagingSenderId: "5525629265",
  measurementId: "G-9PD6LXT0CW",
};

export interface Initiative {
  id: string;
  title: string;
  date: string;
  value: number;
  progress: boolean;
  source: string;
  tag: string[];
}

export async function getInitiatives(): Promise<Initiative[]> {
  const response = await fetch(`${FIREBASE_CONFIG.databaseURL}/initiatives.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch initiatives: ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, Omit<Initiative, "value"> & { value: string }>;

  // Convert object to array, parse value as number, and sort by date (most recent first)
  const initiatives = Object.values(data)
    .map((initiative) => ({
      ...initiative,
      value: parseFloat(initiative.value),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return initiatives;
}
