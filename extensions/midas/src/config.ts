const isDevelopment = process.env.NODE_ENV === "development";

export const config = {
  apiUrl: isDevelopment
    ? "http://localhost:3001" // Development URL
    : "https://api.midas.xyz", // Production URL (replace with your actual production URL)
};
