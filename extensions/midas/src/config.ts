const isDevelopment = process.env.NODE_ENV === "development";

export const config = {
  apiUrl: isDevelopment
    ? "http://localhost:3001" // Development URL
    : "https://api.trymidas.fun", // Production URL (replace with your actual production URL)
};

// export const config = {
//   apiUrl: "https://api.trymidas.fun", // Your deployed server URL
// };
